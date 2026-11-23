import { pick, type RngState } from './rng';

const FIRST = [
  'Ada', 'Bram', 'Cleo', 'Dex', 'Edie', 'Fitz', 'Gus', 'Hattie', 'Ivo', 'Juno', 'Kit', 'Lark', 'Milo', 'Nell', 'Otto',
  'Pip', 'Quinn', 'Rosa', 'Sol', 'Tess', 'Umi', 'Vic', 'Wren', 'Xavi', 'Yara', 'Zed', 'Bea', 'Cosmo', 'Dot', 'Elmo',
  'Flo', 'Hugo', 'Iris', 'Jojo', 'Kip', 'Lula', 'Moss', 'Nico', 'Opal', 'Pearl', 'Rex', 'Suki', 'Tibbs', 'Vera',
];
const LAST = [
  'Puddleby', 'Wobblesworth', 'Fizzwick', 'Bramblecot', 'Higgins', 'Nutterby', 'Plimsoll', 'Quibble', 'Rumbold',
  'Snodgrass', 'Tumbleweed', 'Underfoot', 'Vantablack', 'Whistlecraft', 'Yarrow', 'Crumpet', 'Dimbleby', 'Ellsworth',
  'Figgins', 'Gooseberry', 'Honk', 'Inkpen', 'Jollop', 'Kettleby', 'Lumpkin', 'Mudge', 'Noodle', 'Ogg', 'Pickle',
];

export const TRAITS = ['Speedy', 'Steady Hands', 'Sharp Eye', 'Cheerful', 'Night Owl', 'Tea Fiend', 'Punctual', 'Dramatic'];

export function randomName(r: RngState) {
  return `${pick(r, FIRST)} ${pick(r, LAST)}`;
}
