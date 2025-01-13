import button from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/button/src/index.vue';
import container from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/container/src/Container.vue';
import img from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/img/src/index.vue';
import overlay from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/overlay/src/index.vue';
import page from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/page/src/index.vue';
import qrcode from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/qrcode/src/index.vue';
import text from 'C:/Users/16045/Desktop/code/my-project/low-code/packages/runtime-ui/src/text/src/index.vue';

const components = {
  page,
  text,
  container,
  button,
  overlay,
  img,
  qrcode,
};
const plugins = {};
const entry = {
  components,
  plugins,
};
window.lowcodePresetComponents = entry;
export default entry;
// # sourceMappingURL=comp-entry.js.map
