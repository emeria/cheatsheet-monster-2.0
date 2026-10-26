import { parseCsv } from './csv';

test('drops the header, keeps quoted commas and trims cells', () => {
  const text = '﻿Name,Blessing,Effect\r\n"Blood, Frost, and Death", Grand Chill ,50%\r\n\r\nA,"say ""hi""",\n';
  expect(parseCsv(text)).toEqual([
    ['Blood, Frost, and Death', 'Grand Chill', '50%'],
    ['A', 'say "hi"', ''],
  ]);
});
