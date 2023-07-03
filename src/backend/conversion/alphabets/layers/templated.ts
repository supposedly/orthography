/* eslint-disable template-curly-spacing */
/* eslint-disable no-multi-spaces */

// !!! THIS FILE IS UNFINISHED !!!
// TODO: figure out how to handle ctx stuff
// TODO: figure out what word.meta should look like

import {Function, Union} from "ts-toolbelt";
import {cheat, type Base, newAlphabet} from "../common";
import {
  type Of, type EnumOf, enumerate,
  type Ps, type Gn, type Nb, type TamToken, type VerbWazn, type PPWazn, type VoiceToken, type HigherWazn,
} from "../../enums";
import * as basic from "../basic-symbols";

export const NAME = `templated`;
type $<T> = Function.Narrow<T>;

type Root = [basic.AlphabetSymbol, basic.AlphabetSymbol, basic.AlphabetSymbol, basic.AlphabetSymbol?];

export type Types = {
  word: Word,
  suffix: Suffix
  delimiter: Delimiter
  pronoun: Pronoun
  l: L
  af3al: Af3al
  idafe: Idafe
  number: Number
  participle: Participle
  masdar: Masdar
  verb: Verb
};
// Not a fan of this duplication
// At least I can use EnumOf<...> to statically verify it but still :/
export const $Type: EnumOf<typeof NAME, keyof Types> = enumerate(NAME, `
  word
  suffix
  delimiter
  pronoun
  l
  af3al
  idafe
  number
  participle
  masdar
  verb
  boundary
  literal
`);
export type Type = typeof $Type;

export interface Segment<V, S> extends Base<Of<Type>, V> {
  type: Of<Type>
  meta?: {}
  features?: Readonly<{}>
  value: V
  symbol: S
}

type StringSegment<V, S> = Segment<
  V extends number ? `${V}` : V,
  S extends number ? `${S}` : S
>;

export interface Template<V> extends Base<Of<Type>, V> {
  type: Of<Type>
  meta?: {
    fus7a: boolean
  }
  features?: Readonly<{}>
  value: V
}

export interface Suffix<V = any, S = any> extends StringSegment<V, S> {
  type: Type[`suffix`]
}

export interface Delimiter<V = any, S = any> extends StringSegment<V, S> {
  type: Type[`delimiter`]
  features?: {}
}

export interface Pronoun<
  P extends Of<Ps> = Of<Ps>,
  N extends Of<Nb> = Of<Nb>,
  G extends Of<Gn> = Of<Gn>,
> extends Template<Readonly<{person: P, number: N, gender: G}>> {
  type: Type[`pronoun`]
}

export interface L extends Template<undefined> {
  type: Type[`l`]
}

export interface Af3al<V extends Root = Root> extends Template<V> {
  type: Type[`af3al`]
}

export interface Idafe<
  V extends [Template<any>, Template<any>] = [Template<any>, Template<any>],
> extends Template<V> {
  type: Type[`idafe`]
}

export interface Number<V extends `${number}` = `${number}`> extends Template<V> {
  type: Type[`number`]
}

export interface Participle<V extends Root = Root> extends Template<V> {
  type: Type[`participle`]
  features: Readonly<{
    subject: Pronoun
    voice: VoiceToken
    wazn: PPWazn
  }>
}

export interface Masdar<V extends Root = Root> extends Template<V> {
  type: Type[`masdar`]
  features: Readonly<{
    wazn: HigherWazn
  }>
}

export interface Verb<V extends Root = Root> extends Template<V> {
  type: Type[`verb`]
  features: Readonly<{
    subject: Pronoun
    tam: TamToken
    wazn: VerbWazn
  }>
}

export interface Word<V extends basic.AlphabetSymbol[] = basic.AlphabetSymbol[]> extends Template<V> {
  type: Type[`word`]
}

export type SymbolOf<K extends keyof any, T extends Record<K, any>> = T[K] extends {symbol: string} ? T[K][`symbol`] : K;
export type ValueOf<K extends keyof any, T extends Record<K, any>> = T[K] extends {value: string} ? T[K][`value`] : K;
// lowercase:
export type LowercaseSymbolOf<K extends keyof any, T extends Record<K, any>> = K extends string ? Lowercase<SymbolOf<K, T>> : SymbolOf<K, T>;
export type LowercaseValueOf<K extends keyof any, T extends Record<K, any>> = K extends string ? Lowercase<ValueOf<K, T>> : ValueOf<K, T>;

export type SymbolValueAnd<T> = {symbol?: string, value?: string} & T;
export type SymbolValueAndFeaturesOf<T, U extends string = never> = Record<
  string,
  T extends {features: Readonly<Record<string, any>>}
    ? SymbolValueAnd<Partial<T[`features`]>> & Pick<T[`features`], U>
    : SymbolValueAnd<{}>
>;

export function suffixes<T extends SymbolValueAndFeaturesOf<Suffix>>(
  o: $<T>,
): {[K in keyof typeof o]: Suffix<LowercaseValueOf<K, $<T>>, SymbolOf<K, $<T>>>} {
  return Object.fromEntries(Object.entries(o as T).map(([k, v]) => [
    k,
    {
      type: $Type.suffix,
      value: (v.value ?? k).toLowerCase(),
      symbol: v.symbol ?? k,
    } as Suffix,
  ])) as any;
}

export function delimiters<T extends SymbolValueAndFeaturesOf<Delimiter>>(
  o: $<T>,
): $<{[K in keyof typeof o]: Delimiter<LowercaseValueOf<K, typeof o>, SymbolOf<K, typeof o>>}> {
  return Object.fromEntries(Object.entries(o as T).map(([k, v]) => [
    k,
    {
      type: $Type.delimiter,
      value: (v.value ?? k).toLowerCase(),
      symbol: v.symbol ?? k,
    } as Delimiter,
  ])) as any;
}

type PronounString<S> =
  S extends `${infer P extends Of<Ps>}${infer G extends Of<Gn>}${infer N extends Of<Nb>}`
    ? Pronoun<P, N, G>
    : never;
type PronounStringArray<T extends string[]> = {[K in T[Union.Select<keyof T, number>]]: PronounString<K>};

export function pronouns<T extends `${Of<Ps>}${Of<Gn>}${Of<Nb>}`[]>(p: T): PronounStringArray<T> {
  return Object.fromEntries(
    p.map(s => [s, {
        type: $Type.pronoun,
        value: {
          person: s[0],
          number: s[1],
          gender: s[2],
        },
        /* symbol: none */
      } as PronounString<typeof s>]),
  ) as any;
}

export default newAlphabet(
  NAME,
  cheat<Types>($Type),  // see cheat()'s function comment
  {
    word: {},
    delimiter: delimiters(basic.delimiter),
    suffix: suffixes(basic.suffix),
    pronoun: pronouns(basic.pronoun),
    l: {l: {type: $Type.l, meta: {fus7a: false}, features: {}, value: undefined}},
    af3al: {},
    idafe: {},
    number: {},
    participle: {},
    masdar: {},
    verb: {},
  },
);
