import {rulePack} from '/lib/rules';

import {underlying, templates} from '/languages/levantine/alphabets';

export default rulePack(
  underlying,
  underlying,
  [templates],
  {
    spec: {type: `pronoun`},
    was: {
      templates: {
        spec: ({verb}) => verb(features => features.tam.past),
      },
    },
    env: ({before}, {boundary, delimiter}) => (
      before({
        match: `any`,
        value: [
          boundary((features, traits) => traits.suprasyllabic),
          delimiter(),
        ],
      })
    ),
  }
);