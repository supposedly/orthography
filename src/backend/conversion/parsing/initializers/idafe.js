const {misc: {lastOf}, syllables: {newSyllable}} = require(`../../utils`);
const {parseSyllable} = require(`../../parse-word`);
const {type} = require(`../type`);

function toConstruct(word) {
  if (word.type === type.idafe) {  // this shouldn't ever trigger but ykno...
    toConstruct(lastOf(word.value));
  } else if (word.type === type.number && word.meta.endsIn === `sh`) {
    const lastSyllable = lastOf(word.value).value;
    lastSyllable.meta.weight -= 1;
    word.value.push(parseSyllable`sh.a.r`);
    lastSyllable.pop();  // sh
    lastSyllable.pop();  // schwa
  } else {
    const lastSegment = lastOf(lastOf(word.value).value);
    if (lastSegment.value === `fem`) {
      // technically since verbs are already t === true this makes
      // it okay not to check for verbs vs. nonverbs here
      lastSegment.meta.t = true;
    }
  }
  // mutates but also returns for convenience
  return word;
}

function idafe({
  possessor,
  possessee,
}) {
  possessee = Array.isArray(possessee) ? possessee.map(toConstruct) : [toConstruct(possessee)];
  if (possessor.type === type.idafe) {
    return {
      type: type.idafe,
      meta: {...possessor.meta},
      value: [...possessee, ...possessor.value],
    };
  }
  return {
    type: type.idafe,
    meta: {},
    value: [...possessee, possessor],
  };
}

module.exports = {
  idafe,
};