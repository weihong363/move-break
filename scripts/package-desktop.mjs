import { packager } from '@electron/packager';
const paths = await packager({
  dir: '.', name: 'MoveBreak', out: 'release', overwrite: true,
  platform: 'darwin', arch: process.arch, appBundleId: 'com.movebreak.companion',
  appCategoryType: 'public.app-category.utilities',
  icon: 'electron/assets/movebreak.icns',
  extendInfo: 'electron/Info.plist', prune: false,
  extraResource: 'node_modules/electron/dist/LICENSES.chromium.html',
  ignore: [/^\/node_modules($|\/)/, /^\/src($|\/)/, /^\/devpost($|\/)/, /^\/\.git($|\/)/, /^\/release($|\/)/],
});
console.log(paths.join('\n'));
