import next from '@expence/eslint-config/next';

/**
 * Слои FSD сверху вниз. Импортировать можно только то, что ниже: правило
 * проверяется алиасом `@/<слой>/...`, поэтому внутрисрезовые относительные
 * импорты его не задевают.
 */
const LAYERS = ['app', 'views', 'widgets', 'features', 'entities', 'shared'];

const MESSAGE =
  'FSD: импорт вверх по слоям или в соседний срез. Разрешено только app → views → widgets → features → entities → shared, срезы общаются через публичный API (index.ts).';

/** Слой запрещает сам себя (срезы независимы) и всё, что выше. */
const forbiddenFor = (layer, index) =>
  // shared — слой без срезов, у него только сегменты: они друг о друге знают.
  LAYERS.slice(0, layer === 'shared' ? index : index + 1).flatMap((forbidden) => [
    `@/${forbidden}/*`,
    `@/${forbidden}/*/**`,
  ]);

const fsdBoundaries = LAYERS.map((layer, index) => ({
  files: [`src/${layer}/**`],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [{ group: forbiddenFor(layer, index), message: MESSAGE }] },
    ],
  },
}));

const config = [...next, ...fsdBoundaries];

export default config;
