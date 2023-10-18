import ruleset from './base';
import {letters} from '/languages/levantine/alphabets/underlying';
import {separateContext} from '/lib/rules';

type Doubles<T extends string> = T extends unknown ? `${T}${T}` : never;

export default ruleset(
  {
    spec: {},
    env: {
      target: {
        env: ({before}, {delimiter, boundary}) => before({match: `any`, value: [delimiter(), boundary()]}),
      },
    },
  },
  {
    default: ({features: {root: [$F, $3], theme}}) => [
      separateContext($F, `affected`),
      separateContext($3, `affected`),
      letters.plain.vowel[(theme + theme) as Doubles<typeof theme>],
    ],
  }
);