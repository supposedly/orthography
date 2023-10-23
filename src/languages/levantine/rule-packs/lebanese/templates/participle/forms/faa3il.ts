import ruleset from '../base';
import {letters} from '/languages/levantine/alphabets/underlying';
import {separateContext} from '/lib/rules';

export default ruleset(
  {
    spec: ({participle}) => participle({shape: `faa3il`, voice: `active`}),
  },
  {
    default: ({features: {root: $}}) => [
      separateContext($[0], `affected`),
      letters.plain.vowel.aa,
      separateContext($[1], `affected`),
      letters.plain.vowel.i,
      separateContext($[2], `affected`),
    ],
  }
);