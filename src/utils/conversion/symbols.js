/* eslint-disable no-unexpected-multiline */
/* eslint-disable func-call-spacing */
/* eslint-disable no-spaced-func */

function c(map, createEmphatics = true) {
  function createConsonant(name, symbol, createEmphatic = createEmphatics) {
    if (name === null) {
      // terminate chain
      return map;
    }
    const names = [name];
    if (!/^[a-z_$]$/.test(name[0])) {
      names.push(`_${name}`);
    }
    const obj = {
      type: `consonant`,
      meta: {
        symbol,
        emphatic: false
      },
      value: name
    };
    names.forEach(n => { map[n] = obj; });
    if (createEmphatic) {
      const emphatic = { ...obj, meta: { ...obj.meta, emphatic: true }};
      names.forEach(n => {
        map[`${n}${map.emphatic}`] = emphatic;
      });
    }
    return createConsonant;
  }
  return createConsonant;
}

function v(map) {
  function createVowel(name, symbol, long) {
    if (name === null) {
      // terminate chain
      return map;
    }
    map[name] = {
      type: `vowel`,
      meta: { long, symbol },
      value: name
    };
    return createVowel;
  }
  return createVowel;
}

// anything that isn't a letter is capitalized
export const alphabet = {
  ...c({
    emphatic: `*`  // goes after the emphatic letter
  })
  (`2`, `2`)
  (`3`, `3`)
  (`b`, `b`)
  (`d`, `d`)
  (`f`, `f`)
  (`g`, `g`)
  (`gh`, `9`)
  (`h`, `h`)
  (`7`, `7`)
  (`5`, `5`)
  (`j`, `j`)
  (`k`, `k`)
  (`q`, `q`)
  (`l`, `l`)
  (`m`, `m`)
  (`n`, `n`)
  (`p`, `p`)
  (`r`, `r`)
  (`s`, `s`)
  (`sh`, `x`)
  (`t`, `t`)
  (`v`, `v`)
  (`w`, `w`)
  (`y`, `y`)
  (`z`, `z`)
  (`th`, `8`)
  (`dh`, `6`)
  (`null`, `0`, false)
  (null),

  ...v({})
  (`a`, `a`)
  (`aa`, `A`)
  (`AA`, `@`)  // lowered aa, like in شاي
  (`ae`, `&`)  // 'foreign' ae, like in نان or فادي

  (`i2`, `!`)  // e.g. 2!d`Afc; also word-final as in فادي
  (`i`, `i`)  /* default value of kasra
                   * also for 0<i<a when still in the medial stage, like for ppl with kitIr كتير
                   */
  (`ii`, `I`)

  (`u`, `u`)
  (`uu`, `U`)

  (`e`, `e`)  /* word-final for *-a, like hYdIke
               * plus undecided whether to do e.g. hEdIk or hedIk (or even just hYdIk) هيديك
               * also for loans like fetta فتا or elI إيلي
               * aaand for stuff like mexYk/mexEke and mexAn (when not something like mxYk and mxAn)
               */
  (`ee`, `E`)

  (`o`, `o`)
  (`oo`, `O`)

  (`ay`, `Y`)
  (`aw`, `W`)
  (null),

  _: {  // no schwa
    type: `epenthetic`,
    meta: {
      priority: false
    },
    symbol: `_`
  },

  // fem suffix is its own thing bc -a vs -e vs -i variation
  Fem: {
    type: `suffix`,
    symbol: `c`,
    value: `fem`
  },
  // dual suffix is its own thing bc -ayn/-een vs -aan variation (per Mekki 1984)
  Dual: {
    type: `suffix`,
    symbol: `=`,
    value: `dual`
  },
  // plural suffix is its own thing bc -iin-l- vs -in-l- variation, or stuff
  // like meshteryiin vs meshtriyyiin vs meshtriin
  Plural: {
    type: `suffix`,
    symbol: `+`,
    value: `plural`
  },

  Stressed: {  // goes after the stressed syllable; only use if the word's stress is not automatic
    type: `modifier`,  // idk lol
    symbol: `"`,
    value: `stressed`
  },

  Of: {  // introduces idafe pronouns
    type: `delimiter`,
    symbol: `-`,
    value: `genitive`
  },
  Obj: {  // introduces verbs and active participles
    type: `delimiter`,
    symbol: `.`,
    value: `object`
  },
  PseudoSubject: {  // s`arr~3ms/s`all~3ms, badd~3ms/bidd~3ms, etc
    type: `delimiter`,
    symbol: `~`,
    value: `pseudo-subject`
  },
  Dative: {  // this stands for the dative L
    type: `delimiter`,
    symbol: `|`,
    value: `dative`
  }
};

const higherVerbForms = [
  `fa33al`,
  `tfa33al`,
  `stfa33al`,
  `fe3al`,
  `tfe3al`,
  `stfe3al`,
  `nfa3al`,
  `fta3al`,
  `staf3al`,
  `stAf3al`,  // for stafazz (not stfazz), sta2aal (not st2aal), etc
  `f3all`,
  `fa3la2`,
  `tfa3la2`,
  `stfa3la2`  // probably only theoretically exists lol
];

export const verbForms = [
  `aa`,
  `ai`,
  `au`,
  `ia`,
  `ii`,
  `iu`,
  ...higherVerbForms
];

export const ppForms = [
  `1/both,`,
  `1/fa3len`,
  `1/fe3il`,
  ...higherVerbForms
];

export const pronouns = [
  `1ms`,  // -e according to loun
  `1fs`,  // -i according to loun
  `1ns`,  // the normal neutral one idk
  `1np`,
  `2ms`,
  `2fs`,
  `2ns`,  // maybe someday
  `2mp`,  // -kVm in case it exists in some southern dialect
  `2fp`,  // ditto but -kVn
  `2np`,
  `3ms`,
  `3fs`,
  `3mp`,  // ditto but -(h)Vm
  `3fp`,  // ditto but -(h)Vn
  `3np`
]

export const negative = `X`;  // dunno how to implement this