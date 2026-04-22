import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  ignore: ['**/scripts/**'],
  entry: [
    'src/**/*.ts',
  ],
}

export default config
