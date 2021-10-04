/* eslint-disable max-classes-per-file */
import weighted from 'weighted';
import {moldObject} from './helpers';

import match, {Match} from './match';
import {DepType, TransformType} from './type';
import {Consonant, SegType, Vowel} from '../../symbols';

// see comments above keys() and keys.with()
function makeObjectKeyParser<T = any>(
  emptyValue: (values: T[]) => any,
  givenValue: (value: T) => any = v => v,
) {
  return function parse(keys: TemplateStringsArray, ...values: T[]) {
    values.reverse();
    return JSON.parse(keys.flatMap(
      (string/* , idx */) => [
        string
          .replace(/\w+/g, `"$&"`)
          // this should just be a lookbehind thanks safari
          .replace(/[^,{}:](?=[},])/g, `$&: ${emptyValue(values)}`),
        givenValue(values.pop()),
      ],
    ).join(``));
  };
}

// use this as a template-string tag to select specific keys for use with capture
// specifically if you're passing an object that's not of your own definition and
// you don't need the entire thing to be matched
// usage: keys`{bruh: {test}, bruv}` -> {bruh: {test: {}}, bruv: {}}
// - for example, capture.only(abc.c, keys`{value}`)
// - is just like capture.only(abc.c, {value: {}})
// - which equals capture.only({value: abc.c.value})
// but isn't as redundant, which gets pretty important the more keys you get
// - capture.only({meta: {features: {something: abc.e.something, otherThing: abc.e.otherThing}}})
// - can just be capture.only(abc.e, keys`{meta: {features: {something, otherThing}}}`)
// ALSO you can use this to edit specific values of the object in a similar way to obj.edit()
// - capture.only(abc.w, keys`{value, meta: {weak: ${true}, features: {emphatic: ${true}}}})
// - instead of capture.only({value: abc.w.value, meta: {weak: true, features: {emphatic: true}}})
// that part is definitely not much of a space-saver and you'll likely end up doing this instead:
// capture.only(abc.w, keys`{value}`, keys.with(true)`{meta: {weak}, features: {emphatic}}`)
// or just:
// capture.only(abc.w, keys`{value}`, {meta: {weak: true, features: {emphatic: true}}})
// but having the option to do it in this one function is still nice
export const keys = Object.assign(
  // just an empty match object for when no match is given, signaling to the capture functions that
  // they should match everything for this key
  makeObjectKeyParser(() => `{}`),
  {
    // keys.with(true)`{meta: {weak, features: {emphatic}}}`
    // => {meta: {weak: true, features: {emphatic: true}}},
    // keys.with(true, false)`{meta: {weak, features: {emphatic}}`
    // => {meta: {weak: true, features: {emphatic: false}}}
    // keys.with(true, false)`{meta: {weak: ${1}}, features: {emphatic: ${0}, etc: ${1}}}`
    // => they're indices, you get it
    // overkill? yes
    // having fun tho? heck yes
    with(...options: any[]) {
      const poppableOptions = options.slice().reverse();
      return makeObjectKeyParser(
        options.length === 1 ? () => options[0] : () => poppableOptions.pop(),
        (idx: number) => options[idx],
      );
    },
  },
);

interface Obj<V> {
  type: SegType,
  meta: {features?: Record<string, any>} & Record<string, any>,
  value: V,
  context: Record<string, any>
}

function copySeg<V>(obj: Obj<V>) {
  return {
    type: obj.type,
    meta: {...obj.meta, features: {...(obj.meta ? obj.meta.features : null)}},
    value: obj.value,
    context: {...obj.context},
  };
}

class DefaultObject<K extends string | number | symbol, V> {
  private map: Record<K, V>;

  constructor(obj: Record<K, V>, private newEntry: (key: K) => V) {
    this.map = obj;
    this.newEntry = newEntry;
  }

  ensure(key: K) {
    if (this.map[key] === undefined) {
      this.map = Object.assign(this.map, this.newEntry(key));
    }
    return this.map[key];
  }

  keys() {
    return Object.keys(this.map);
  }

  values() {
    return Object.values(this.map);
  }

  entries() {
    return Object.entries(this.map);
  }
}

type EnvironmentObj<T extends SegType> = {
  type: T,
  $deps: Environment,
  $exists: boolean,
  $was: SegType[]
};

interface Environment {
  [DepType.next]: EnvironmentObj<SegType>,
  [DepType.nextConsonant]: EnvironmentObj<SegType.consonant>,
  [DepType.nextVowel]: EnvironmentObj<SegType.vowel>,
  [DepType.prev]: EnvironmentObj<SegType>,
  [DepType.prevConsonant]: EnvironmentObj<SegType.consonant>,
  [DepType.prevVowel]: EnvironmentObj<SegType.vowel>,
  [DepType.type]: SegType,
  [DepType.word]: Consonant[`meta`] | Vowel[`meta`],
}

type Rule<T> = {
  layer: string,
  value: any,
  do: TransformType,
  spec: {
    into: T[],
    where?: Match,
    because: string,
  }
};

class Rules<T> {
  matchers: Rule<T>[];

  constructor() {
    // this.raw = [];
    this.matchers = [];
  }

  add(rule: Rule<T>) {
    // this.raw.push(rule);
    this.matchers.push({
      ...rule,
      value: match(rule.value),
      spec: {
        ...rule.spec,
        where: rule.spec.where && match(rule.spec.where),
      },
    });
  }
}

// XXX: this feels like a bad idea bc recursive dependency...
// (TrackerList contains Trackers and Tracker can contain TrackerLists)
class TrackerList {
  constructor(word: Obj<any>, rules: Rules, layers, minLayer = 0, parent = null) {
    let head = null;
    let last = null;
    for (const segment of word.value) {
      if (head === null) {
        head = last = new Tracker(segment, rules, layers, word.meta, {minLayer, parent: this});
      } else {
        last.next = new Tracker(segment, rules, layers, word.meta, {prev: last, minLayer, parent: this});
        last = last.next;
      }
    }

    this._head = head;
    this._tail = last;

    this.parent = parent;
    this.prev = this.parent && this.parent.prev;
    this.next = this.parent && this.parent.next;
  }

  get head() {
    if (this._head && this._head.node.prev !== null) {
      this._head = this._head.node.prev;
    }
    return this._head;
  }

  get tail() {
    if (this._tail && this._tail.node.next !== null) {
      this._tail = this._tail.node.next;
    }
    return this._tail;
  }

  isEmpty() {
    if ((this.head === null) !== (this.tail === null)) {
      throw new Error(`only one end of this TrackerList is empty`);
    }
    return this.head === null;
  }

  forEach(f) {
    let node = this.head;
    if (node) {
      do {
        f(node);
      } while (node = node.next);
    }
  }

  /*
  reduce(initial, f) {
    let node = this.head;
    if (!node) {
      return initial;
    }
    let accumulator = initial;
    do {
      accumulator = f(node, accumulator);
    } while (node = node.next);
    return accumulator;
  }

  forEach(f) {
    return this.reduce(null, f);
  }
  */
}

class TrackerChoices {
  constructor(choices = [], reason = ``, rule = -1, environment = match({}), current = 0) {
    this.choices = choices;
    this.reason = reason;
    this.rule = rule;
    this.environment = environment;
    this.current = current;
  }

  choose(idx) {
    this.current = idx;
  }

  getCurrentChoice() {
    return this.choices[this.current];
  }
}

class TrackerHistory {
  constructor() {
    this.history = [];
    this.current = -1;
  }

  revert(idx) {
    this.current = idx;
  }

  insert(...newHistory) {
    this.history.splice(this.current + 1, this.history.length);
    this.history.push(...newHistory);
    this.current = this.history.length - 1;
  }

  insertOne(choice, ...args) {
    this.insert(new TrackerChoices(choice, ...args));
  }

  choose(idx) {
    if (idx === this.history[this.current].current) {
      this.revert(this.current + 1);
      return false;
    }
    this.history[this.current].choose(idx);
    this.insert();
    // caller now has to call this.insert(...) to update
    return true;
  }

  getChoice(idx) {
    return this.history[idx].getCurrentChoice();
  }

  getCurrentChoice() {
    const currentChoices = this.history[this.current];
    return currentChoices && currentChoices.getCurrentChoice();
  }
}

class Tracker {
  static DEP_FILTERS = {
    [DepType.prevConsonant]: match({type: SegType.consonant}),
    [DepType.nextConsonant]: match({type: SegType.consonant}),
    [DepType.prevVowel]: match({type: SegType.vowel}),
    [DepType.nextVowel]: match({type: SegType.vowel}),
  };

  constructor(segment, rules, layers, wordInfo, {prev = null, next = null, minLayer = 0, parent = null}) {
    this.node = {prev, next};
    this.rules = rules;
    this.wordInfo = wordInfo;
    this.parent = parent;
    this.minLayer = minLayer;

    const layerNames = Object.keys(layers);
    this.layers = layers;
    this.dependents = new DefaultObject({}, () => new Map());

    // update environment/dependencies on demand
    this.environmentCache = layerNames.map(() => ({})); // don't neeeed => Object.fromKeys(deptype...etc) since i just test for undefined lol
    this.environment = layerNames.map(
      (_, layer) => DepType.keys.reduce(
        (o, dep) => (layer < this.minLayer ? {} : Object.defineProperty(o, dep, {
          get: () => {
            if (this.environmentCache[layer][dep] === undefined) {
              this.environmentCache[layer][dep] = this.findDependency(layer, DepType[dep]);
            }
            return this.environmentCache[layer][dep];
          },
        })),
        {},
      ),
    );

    this.history = layerNames.map(() => new TrackerHistory());
    // insert underlying segment to kick things off
    this.history[this.minLayer].insertOne([segment], `Underlying.`);
  }

  get prev() {
    return this.node.prev || (this.parent && this.parent.prev);
  }

  set prev(item) {
    if (item) {
      item.prev = this.node.prev;
    }
    this.node.prev = item;
  }

  get next() {
    return this.node.next || (this.parent && this.parent.next);
  }

  set next(item) {
    if (item) {
      item.next = this.next;
    }
    this.node.next = item;
  }

  invalidateDependencies(layer, ...keys) {
    keys.forEach(key => {
      this.environmentCache[layer][key] === undefined;
    });
  }

  retrieveDependency(layer, dep) {
    const currentChoice = this.getCurrentChoice(layer);
    if (dep > DepType.type && currentChoice instanceof TrackerList) {
      const recurse = tracker => this.findRecursiveDependency(layer, tracker, dep, Tracker.DEP_FILTERS[dep]);
      switch (dep) {
        case DepType.prev:
        case DepType.prevVowel:
        case DepType.prevConsonant:
          return recurse(currentChoice.tail);

        case DepType.next:
        case DepType.nextVowel:
        case DepType.nextConsonant:
          return recurse(currentChoice.head);
      }
    }
    return this.environment[layer][DepType.keys[dep]];
  }

  findDependency(layer, dep) {
    const recurse = tracker => this.findRecursiveDependency(layer, tracker, dep, Tracker.DEP_FILTERS[dep]);
    switch (dep) {
      /* constant dependencies */
      case DepType.word:
        return this.wordInfo;
      case DepType.type:
        return this.getCurrentChoice(layer).type;

      /* reactive dependencies */
      case DepType.prev:
      case DepType.prevVowel:
      case DepType.prevConsonant:
        return recurse(this.prev);

      case DepType.next:
      case DepType.nextVowel:
      case DepType.nextConsonant:
        return recurse(this.next);

      default:
        throw new Error(
          `Unknown dep: ${dep} for ${this} (enum value ${DepType.keys[dep]})`,
        );
    }
  }

  findRecursiveDependency(layer, neighbor, relationship, constraint) {
    if (!constraint) {
      return this.react(layer, neighbor, relationship);
    }
    if (!neighbor) {
      return null;
    }
    if (neighbor.matches(layer, constraint)) {
      return this.react(layer, neighbor, relationship);
    }
    return this.react(layer, neighbor.retrieveDependency(layer, relationship), relationship);
  }

  react(layer, tracker, relationship) {
    if (!tracker) {
      return {$exists: false};
    }
    // TODO: can do better than just `relationship` now that deps aren't in a black box,
    // use helpers.qualifyKeys() here instead (this will likely help with recognizing
    // infinite recursion)
    tracker.addDependent(layer, this, relationship);
    return {
      ...tracker.getCurrentChoice(layer),
      $deps: tracker.environment[layer],
      $exists: true,
    };
  }

  addDependent(layer, tracker, relationship) {
    const dependentsAtLayer = this.dependents.ensure(layer);
    if (!dependentsAtLayer.has(tracker)) {
      dependentsAtLayer.set(tracker, new Set());
    }
    dependentsAtLayer.get(tracker).add(relationship);
  }

  matches(layer, props) {
    const currentChoice = this.getCurrentChoice(layer);
    return !(currentChoice instanceof TrackerList) && props.matches(currentChoice);
  }

  updateChoice(layer, choicesIdx, newChoiceIdx) {
    const history = this.history[layer];
    history.revert(choicesIdx);
    if (history.choose(newChoiceIdx)) {
      this.applyRules(layer);
    }
  }

  applyRules(layer, minIdx = 0) {
    this.rules.matchers.slice(minIdx).forEach((rule, idx) => {
      const value = this.getCurrentChoice(layer);
      if (
        layer === rule.layer
        && rule.value.matches(value)
        && (rule.spec.where === null || rule.spec.where.matches(this.environment[layer]))
      ) {
        switch (rule.do) {
          case TransformType.transformation:
            this.transform(layer, idx, rule.spec);
            break;
          case TransformType.promotion:
            this.promote(layer, idx, rule.spec);
            layer += 1;
            break;
          case TransformType.expansion:
            this.expand(layer, idx, rule.spec);
            layer += 1;
            break;
        }
      }
    });
  }

  reapplyRules(layer) {
    this.history[layer].revert(
      this.history[layer].history.findIndex(
        choices => !choices.environment.matches(this.environment[layer]),
      ),
    );
    this.applyRules(layer, this.history[layer].getCurrentChoice().rule);
  }

  invalidateDependents(layer) {
    this.dependents.ensure(layer).forEach((relationships, tracker) => {
      tracker.invalidateDependencies(layer, ...relationships);
      tracker.reapplyRules(layer);
    });
  }

  transform(layer, ruleIdx, {into, odds, where: environment, because}) {
    this.history[layer].insertOne(into, because, ruleIdx, environment, weighted(odds));
    this.invalidateDependents(layer);
  }

  promote(layer, ruleIdx, {into, odds, because}) {
    this.history[layer + 1].revert(-1);
    this.history[layer + 1].insertOne(into, because, ruleIdx, environment, weighted(odds));
    this.invalidateDependents(layer);
  }

  expand(layer, ruleIdx, {into, odds, where: environment, because}) {
    this.history[layer + 1].revert(-1);
    this.history[layer + 1].insertOne(
      into.map(value => new TrackerList({value}, this.rules, this.layers, layer + 1, this)),
      because,
      ruleIdx,
      environment,
      weighted(odds),
    );
    this.invalidateDependents(layer);
  }

  getCurrentChoice(layer) {
    const currentChoice = this.history[layer].getCurrentChoice();
    if (!(currentChoice instanceof TrackerList)) {
      return currentChoice;
    }
    const arr = [];
    currentChoice.forEach(node => arr.push(node.getCurrentChoice(layer)));
    return arr;
  }
}

export class WordManager {
  constructor(word, alphabets) {
    const abcNames = Object.keys(alphabets);
    this.layerIndices = Object.fromEntries(abcNames.map((name, idx) => [name, idx]));
    this.layers = Object.fromEntries(
      // objects preserve insertion order (given non-numerical keys)
      abcNames.map((name, idx, arr) => [
        name,
        {
          alphabet: alphabets[name],
          prev: abcNames[arr[idx - 1]],
          next: abcNames[arr[idx + 1]],
        },
      ]),
    );

    this.rules = new Rules();
    this.trackers = new TrackerList(word, this.rules, this.layerIndices);
  }

  addRule(rule) {
    rule = {...rule, spec: {...rule.spec}};
    rule.layer = this.layerIndices[rule.layer];
    if (!rule.spec.where) {
      rule.spec.where = null;
    }
    if (!Array.isArray(rule.spec.into)) {
      rule.spec.odds = Object.fromEntries(
        Object.values(rule.spec.into).map((weight, idx) => [idx, weight]),
      );
      rule.spec.into = Object.keys(rule.spec.into);
    } else if (!rule.spec.odds) {
      rule.spec.odds = Object.fromEntries(rule.spec.into.map((_, idx) => [idx, +!idx]));
    } else if (Array.isArray(rule.spec.odds)) {
      rule.spec.odds = Object.fromEntries(rule.spec.odds.map((weight, idx) => [idx, weight]));
    }
    return this.rules.add(rule);
  }

  init() {
    return this.trackers.forEach(node => node.applyRules(0));
  }

  collect(layer) {
    const arr = [];
    this.trackers.forEach(node => arr.push(node.getCurrentChoice(layer)));
    return arr;
  }
}

type RuleObj = {

};

class CaptureApplier {
  constructor(layer, manager, capturedSpec) {
    this.layer = layer;
    this.manager = manager;
    this.captured = capturedSpec;
  }

  apply(type, spec) {
    this.manager.addRule({
      layer: this.layer,
      value: this.captured,
      do: type,
      spec,
    });
    return this;
  }

  transform(spec) {
    return this.apply(TransformType.transformation, spec);
  }

  expand(spec) {
    return this.apply(TransformType.expansion, spec);
  }

  promote(spec) {
    return this.apply(TransformType.promotion, spec);
  }
}

class Capture {
  constructor(alphabet, alphabetName, manager) {
    this.alphabet = {name: alphabetName, alphabet};
    this.manager = manager;
  }

  between() {
    throw new Error(`capture.between() isn't implemented yet`);
  }

  segment(obj, ...specifiers) {
    return new CaptureApplier(
      this.alphabet.name,
      this.manager,
      moldObject(obj, ...specifiers),
    );
  }

  segmentOfType(type, ...props) {
    return this.segment({}, {type}, ...props);
  }

  consonant(...props) {
    return this.segmentOfType(SegType.consonant, ...props);
  }

  vowel(...props) {
    return this.segmentOfType(SegType.vowel, ...props);
  }

  epenthetic(...props) {
    return this.segmentOfType(SegType.epenthetic, ...props);
  }

  suffix(...props) {
    return this.segmentOfType(SegType.suffix, ...props);
  }

  prefix(...props) {
    return this.segmentOfType(SegType.prefix, ...props);
  }

  augmentation(...props) {
    return this.segmentOfType(SegType.augmentation, ...props);
  }
}

export class Word {
  constructor(wordObj, alphabets) {
    this.word = {
      type: wordObj.type,
      meta: {...wordObj.meta},
      value: wordObj.value.map(copySeg),
      context: [...(wordObj.context || [])],
    };

    this.manager = new WordManager(this.word, alphabets);
    this.capture = Object.fromEntries([
      ...Object.entries(alphabets).map(
        ([name, abc]) => [name, new Capture(abc, name, this.manager)],
      ),
    ]);
    this.abc = alphabets;
  }

  init() {
    this.manager.init();
  }

  collect(layer) {
    return this.manager.collect(layer);
  }
}