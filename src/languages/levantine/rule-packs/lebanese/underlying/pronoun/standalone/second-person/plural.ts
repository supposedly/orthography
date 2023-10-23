import ruleset from './base';
import {letters} from '/languages/levantine/alphabets/underlying';

export default ruleset(
  {
    spec: ({pronoun}) => pronoun(features => features.number.plural),
    env: {},
  },
  operations => ({
    // TODO: probably want gender here (hintni, 2inten, stuff idk)
    default: [operations.postject(letters.plain.vowel.uu)],
  })
);
