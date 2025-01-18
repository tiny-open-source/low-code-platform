# CHANGELOG

## [1.0.2](https://github.com/tiny-open-source/low-code-platform/compare/v1.0.1...v1.0.2) (2025-01-18)


### Features

* no publish ([b76f81f](https://github.com/tiny-open-source/low-code-platform/commit/b76f81f394fa116b34b62a969908a40fc4a597c4))



## [1.0.1](https://github.com/tiny-open-source/low-code-platform/compare/c888b16d25b8c58fedd8c408a4de1c1f00e3be63...v1.0.1) (2025-01-18)


### Bug Fixes

* 当前选中组件处于流式布局模式下时，直接拖动其他组件会错误判断成是流式组件 ([481196d](https://github.com/tiny-open-source/low-code-platform/commit/481196dc3e5d5930d7cb382db4437d06e0c1f67c))
* 修复多选组件时新增组件的体验问题 ([2533eeb](https://github.com/tiny-open-source/low-code-platform/commit/2533eeb101cd904db6b016a0e3c6caaea4a94bbe))
* **core:** 事件触发时组件未初始化，等组件初始化后再调用事件处理 ([ab29121](https://github.com/tiny-open-source/low-code-platform/commit/ab291211c3aae8e7c2d0f99181a4b60c156a161d))
* **designer:** 画布大小与stageRect配置不相符 ([4650f32](https://github.com/tiny-open-source/low-code-platform/commit/4650f32c9387aedda9eda814c5f36909399bb443))
* **designer:** 新增页面时会有一个error ([75e509a](https://github.com/tiny-open-source/low-code-platform/commit/75e509a7d59b41c2f44fcf0e80fd758c658c056e))
* **designer:** 新增组件id不对 ([a7863f5](https://github.com/tiny-open-source/low-code-platform/commit/a7863f5eed71e14aba4e13bf65b93a4d25ceebf2))
* **editor:** 水平居中 ([da71ecf](https://github.com/tiny-open-source/low-code-platform/commit/da71ecfc1ecd101d3b543efc91f35f3f3a0bd86d))
* **editor:** 拖动组件到最右边会多出1px ([ce8f2ad](https://github.com/tiny-open-source/low-code-platform/commit/ce8f2ad444a90b7df587641b9f1f962ecc65d074))
* form label 定宽 ([2049e02](https://github.com/tiny-open-source/low-code-platform/commit/2049e02c728c10f53260d7ba1b8e0c93238417fa))
* **form:** 初始化values时，数组中的对象出现key丢失 ([5f41e81](https://github.com/tiny-open-source/low-code-platform/commit/5f41e8186058d2fb16ba36c02b54883c15e56d38))
* **form:** fieldset checkbox change事件不会触发 ([aabe9de](https://github.com/tiny-open-source/low-code-platform/commit/aabe9de491001fc62e8e539ba5b5718a3bb98666))
* **form:** tabs配置name后出错 ([9c2da82](https://github.com/tiny-open-source/low-code-platform/commit/9c2da829c232d426874ea4b511fc71b1d68454e7))
* path ([8bb1682](https://github.com/tiny-open-source/low-code-platform/commit/8bb16821571404109b313c97e6153019d4b38c56))
* path ([0504daa](https://github.com/tiny-open-source/low-code-platform/commit/0504daa76079911e6a5a6efc73c45b0eb4e13453))
* path ([1c9cd7e](https://github.com/tiny-open-source/low-code-platform/commit/1c9cd7ed86fa749992926f9a7a1284e131cf5c6a))
* path ([a24f98a](https://github.com/tiny-open-source/low-code-platform/commit/a24f98ad50cbd1a147c5b8ab9260de072fd5f4cb))
* path ([852caeb](https://github.com/tiny-open-source/low-code-platform/commit/852caebbb886b06f70b4f5e4c43a05c675da5918))
* prop ([cddca8a](https://github.com/tiny-open-source/low-code-platform/commit/cddca8a37aba74884025d2258890ef21633ea97d))
* **runtime:** lowcodeRuntimeReady时机修改 ([dfe1106](https://github.com/tiny-open-source/low-code-platform/commit/dfe1106e3ae77b5ace6e020128c4506a0e5fc346))
* **stage,runtime:** lowcodeRuntimeReady时机修改 ([85f86b2](https://github.com/tiny-open-source/low-code-platform/commit/85f86b223cb96c32414e5b37c49bfc016283d40b))
* undo redo & icon bug ([2d16632](https://github.com/tiny-open-source/low-code-platform/commit/2d16632ea499b8b93df814260e99f0f0ba7d069c))


### Features

* 编辑器框架搭建 ([2d2ca73](https://github.com/tiny-open-source/low-code-platform/commit/2d2ca7326e63ab7ed8df516745db43fe20418e0e))
* 初步解析表单 ([0f45c4c](https://github.com/tiny-open-source/low-code-platform/commit/0f45c4cb0c5d4d4e5e5ee25a9e8594d9614281ed))
* 初始化代码编辑组件 ([b78ad5a](https://github.com/tiny-open-source/low-code-platform/commit/b78ad5a9e88cb856df01f35d58a2cb77a670cc13))
* 打通runtime和编辑器的基本通信 ([7f02932](https://github.com/tiny-open-source/low-code-platform/commit/7f0293277fc7875ada54093b0d13bd20d9419fde))
* 兼容设备模板 ([1348e25](https://github.com/tiny-open-source/low-code-platform/commit/1348e25e31004e7d7898104d9487859cde34798d))
* 建立子包连结 ([02c2f39](https://github.com/tiny-open-source/low-code-platform/commit/02c2f39fcc49964a5ac0d63f35756c8605246f08))
* 框架区域可调 ([8e3786f](https://github.com/tiny-open-source/low-code-platform/commit/8e3786fe41ef1d3c7f69d799bec55532c7b1d51a))
* 面板可添加组件 ([d8efe7b](https://github.com/tiny-open-source/low-code-platform/commit/d8efe7bff5fbc0bf4f09ef5665d8aa6593a20442))
* 同步mask和runtime滚动状态 ([b750a14](https://github.com/tiny-open-source/low-code-platform/commit/b750a149cd44c2dbfbcbac7a0069b90c1c179036))
* 完善表单联动 ([6216a42](https://github.com/tiny-open-source/low-code-platform/commit/6216a42c86570c825e43a7e8bbc1fbaeb599ba71))
* 完善事件tab ([4aa8adb](https://github.com/tiny-open-source/low-code-platform/commit/4aa8adb0adb9beeff78ab88c1f49969677c32375))
* 完善拖拽事件 ([dbfcb44](https://github.com/tiny-open-source/low-code-platform/commit/dbfcb442fc5e32776270f1b5a22b1f24860318bb))
* 完善form组件 ([668150b](https://github.com/tiny-open-source/low-code-platform/commit/668150b8225ecdc701089d38e96882df3d84e596))
* 完善Stage ([63759cf](https://github.com/tiny-open-source/low-code-platform/commit/63759cf1e954a369c6122eeb68c7bd3cf3d7ecc0))
* 相关样式优化 ([430707e](https://github.com/tiny-open-source/low-code-platform/commit/430707e8a1e9d2991becc05b522178f4ea1a7879))
* 项目框架搭建 ([27dd7de](https://github.com/tiny-open-source/low-code-platform/commit/27dd7de33d767c64da0911ee97a5307b1b55aaa3))
* 预览功能完善 ([c3e44cf](https://github.com/tiny-open-source/low-code-platform/commit/c3e44cfb1bfaedfd4ae30025401eb416dc2808b1))
* 增加stage右键菜单 ([275cffe](https://github.com/tiny-open-source/low-code-platform/commit/275cffe7d78005fc4503171d11d4606d552544ef))
* 支持将组件拖动到指定容器 ([4658f68](https://github.com/tiny-open-source/low-code-platform/commit/4658f6801c18f09d3b8733b0fd31be3bd2522bf6))
* 支持通过按住shift键进行组件多选的能力 ([8df6ae9](https://github.com/tiny-open-source/low-code-platform/commit/8df6ae998369e82c7948247587e3923ba9e467f3))
* 组件库替换为naive-ui ([b201bdb](https://github.com/tiny-open-source/low-code-platform/commit/b201bdb811d4f8450029a718b5fc884ea4e79125))
* add @lowcode/form ([c7151a4](https://github.com/tiny-open-source/low-code-platform/commit/c7151a4390722f78ea43e2a5527aab8d21ac2c75))
* add env config file ([e7fe6e6](https://github.com/tiny-open-source/low-code-platform/commit/e7fe6e6159de0d9af7644340fbc8c821c50ea2c8))
* add form component ([13315df](https://github.com/tiny-open-source/low-code-platform/commit/13315df9930292b8ffbf8c2abfc05b480037e230))
* add layer panel ([3a37324](https://github.com/tiny-open-source/low-code-platform/commit/3a3732401196e22bae16e58964c417ddb7112a34))
* add lowcode schema ([9be995e](https://github.com/tiny-open-source/low-code-platform/commit/9be995e5ebb567a56f27d0834103e57e13c87237))
* add menu ([30b7988](https://github.com/tiny-open-source/low-code-platform/commit/30b79883bcf965c3058cd259fe3436e50aaa3f6f))
* add monaco editor ([fbbc72e](https://github.com/tiny-open-source/low-code-platform/commit/fbbc72ec6c1e0ee606ade00bbb2de57ac45bf459))
* add playground deploy workflow ([9e72b30](https://github.com/tiny-open-source/low-code-platform/commit/9e72b304b51cd951b4a30a46415a8c04ae0a2af3))
* add ruler ([2fe2ba9](https://github.com/tiny-open-source/low-code-platform/commit/2fe2ba91637493ea55ae18c1ad61f95fc3fd826f))
* add runtime button component ([15c06b4](https://github.com/tiny-open-source/low-code-platform/commit/15c06b4be1964125bb7862f622ee1725eaa2ae3a))
* add runtime core ([9bf21b8](https://github.com/tiny-open-source/low-code-platform/commit/9bf21b81bca5682fa1f1287b7ce3ae13da72a207))
* add shortcut key ([2632e41](https://github.com/tiny-open-source/low-code-platform/commit/2632e41d65c71164ea7a635788f1314d5a35f67f))
* add ui select mode ([e42985e](https://github.com/tiny-open-source/low-code-platform/commit/e42985e818de632eef606470df04a2938604ed79))
* base framework ([5050777](https://github.com/tiny-open-source/low-code-platform/commit/5050777e5ba59a2f4c969bdd9dca2d18c2c1fc47))
* component-panel 基本样式 ([327aac9](https://github.com/tiny-open-source/low-code-platform/commit/327aac91bea5e95f0dee7f92afa9485d6917414c))
* **designer:** 添加props-panel-header slot;修改layer-panel,component-list-panel slot名称，加上-header ([da087a5](https://github.com/tiny-open-source/low-code-platform/commit/da087a5ba31bd0e4b162a4b86fcd930bc1021a2e))
* **designer:** editorService.add 的addNode参数对象中加上inputEvent ([4e0f4f2](https://github.com/tiny-open-source/low-code-platform/commit/4e0f4f22802cd81c0ee02a5ef306ab95583263eb))
* **editor:** 添加layer-panel/component-list-panel slot ([59da4bb](https://github.com/tiny-open-source/low-code-platform/commit/59da4bb4e4fda692eb8a5c443abf241df0452f46))
* event trigger and form prop size ([ef39cb2](https://github.com/tiny-open-source/low-code-platform/commit/ef39cb26c67785b834e1e347c4d91b4641dc72b1))
* init ([a579911](https://github.com/tiny-open-source/low-code-platform/commit/a579911aeacc816f3d4cf15d6358a40665168f08))
* init ([38ae04b](https://github.com/tiny-open-source/low-code-platform/commit/38ae04b5e98b24d6991e5882923a54a531d368a6))
* init template ([c888b16](https://github.com/tiny-open-source/low-code-platform/commit/c888b16d25b8c58fedd8c408a4de1c1f00e3be63))
* mask 初始化 ([15ef9a7](https://github.com/tiny-open-source/low-code-platform/commit/15ef9a7bc7d88f7288ef71cdca7a78f0c5a5a03a))
* runtime ui组件搭建 ([e3d0ab9](https://github.com/tiny-open-source/low-code-platform/commit/e3d0ab9c114cf29ec8b856b8aef3fcf7a5044288))
* runtime热更 ([15e84ea](https://github.com/tiny-open-source/low-code-platform/commit/15e84ea6a4c0627eda46c3953c9363cda93c9e1b))
* show source code & device group ([17b862b](https://github.com/tiny-open-source/low-code-platform/commit/17b862bfcfb753d09faedfbc40163c96488b0d87))
* stage 宽高计算 ([19e3c82](https://github.com/tiny-open-source/low-code-platform/commit/19e3c823a948534ab54e053e30d52dd70f7f1801))
* **stage:** 1) 高亮边框样式加粗 ([24d5afe](https://github.com/tiny-open-source/low-code-platform/commit/24d5afea7b725f5ac9db8078171e45318924b871))
* tmagic ([8fb0583](https://github.com/tiny-open-source/low-code-platform/commit/8fb058343f1eefbe729b67cd0b17f508d7b2dc4d))
* update deps ([2ef5789](https://github.com/tiny-open-source/low-code-platform/commit/2ef5789df735489a3b43e15a872342ab7fa361c6))



