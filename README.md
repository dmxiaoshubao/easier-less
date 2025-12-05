# easy-use-less-vue

🖖 一个方便使用 less 的 vscode 插件，专为 Vue 和 Less 开发优化

fork 自 https://github.com/ADKcodeXD/easier-less
在原插件基础上增强了 Vue SFC 支持和诸多实用功能

## ✨ 核心功能

### 1. 智能自动补全
- 📝 **变量补全**：输入 `@` 自动提示所有 Less 变量，色值变量会显示颜色
- 🎯 **类名/Mixin 补全**：输入 `.` 自动提示所有类名和 Mixin 方法
- 🎨 **Vue SFC 支持**：在 `.vue` 文件的 `<style lang="less">` 标签内智能触发
- 🚫 **智能过滤**：自动排除括号内的补全（避免在函数参数中误触发）

### 2. 悬浮提示
- 🔍 鼠标悬停在变量或方法上，即时显示其定义内容
- 💡 快速查看变量值，无需跳转文件

### 3. 跳转定义
- ⚡ 按住 `Cmd/Ctrl` 点击变量或类名，直接跳转到定义位置
- 📍 支持 Less 文件和 Vue SFC 中的跳转
- 🎯 支持普通 CSS 类名和 Mixin 方法的跳转

### 4. 🔥 路径别名支持
- 📂 支持 `@/` 路径别名（指向项目根目录）
- 🔗 自动解析相对路径和绝对路径
- 🎯 配置文件时自动转换为 `@/` 格式，便于项目迁移

### 5. 🔄 递归导入加载
- 📦 自动递归加载 `@import` 导入的所有文件
- 🛡️ 智能循环引用保护
- 🌳 支持多层嵌套导入

### 6. ⚡ 实时文件监听
- 👀 监听所有 Less 文件（包括递归导入的文件）
- 🔄 文件修改后自动重新加载，无需重启 VS Code
- 📢 状态栏实时显示加载状态
- ⚠️ 文件删除时显示警告提示

### 7. 🎨 增强的 CSS 类支持
- ✅ 支持普通 CSS 类（如 `.button`）
- ✅ 支持 Mixin 方法（如 `.button(@color)`）
- ✅ 自动去重，避免补全时出现双点号


## 🎬 功能演示

### 变量自动补全
![](images/variable-auto-completion.gif)
### 方法自动补全
![](images/method-auto-completion.gif)
### 悬浮提示
![](images/floating-tip.gif)
### 跳转定义
![](images/jump-definition.gif)

## 🚀 使用

### 初次使用
1. 打开项目，打开任意 Less 或 Vue 文件
2. 插件会提示选择 Mixin 文件（存放变量、方法的文件）
3. 支持多选文件，选择后自动保存到项目配置

### 手动配置

在项目根目录创建或编辑 `.vscode/settings.json`：

```json
{
  "less.files": [
    "@/src/styles/variables.less",
    "@/src/styles/mixins.less",
    "src/styles/theme.less"
  ],
  "less.notice": true,
  "less.suppressNotice": false
}
```

#### 配置说明

- **`less.files`**: Less 文件路径数组
  - 支持 `@/` 别名（指向项目根目录）
  - 支持相对路径（相对于项目根目录）
  - 支持绝对路径

- **`less.notice`**: 是否显示初次使用提示（默认 `true`）
  - 全局配置，影响所有项目

- **`less.suppressNotice`**: 不再提示选择 Mixin 文件（默认 `false`）
  - 项目级别配置，仅对当前项目生效
  - 点击弹窗中的"不再提示"按钮后自动设置为 `true`
  - 删除或改为 `false` 可重新启用提示

### 路径格式示例

```json
{
  "less.files": [
    // ✅ 推荐：使用 @ 别名
    "@/src/styles/variables.less",

    // ✅ 支持：相对路径
    "src/styles/mixins.less",

    // ✅ 支持：绝对路径
    "/Users/username/project/src/styles/theme.less"
  ]
}
```

## 🎯 使用场景

### 场景 1：Less 文件中使用
```less
// 输入 @ 自动补全变量
.container {
  color: @primary-color; // 自动补全并显示色值
}

// 输入 . 自动补全 Mixin
.box {
  .border-radius(4px); // 自动补全方法名
}
```

### 场景 2：Vue SFC 中使用
```vue
<template>
  <div class="my-component"></div>
</template>

<style lang="less" scoped>
.my-component {
  // 在 style 标签内，输入 @ 或 . 触发补全
  background: @bg-color;
  .flex-center(); // Mixin 补全
}
</style>
```

### 场景 3：递归导入
```less
// variables.less
@primary-color: #1890ff;
@import './theme.less';

// theme.less
@import './colors.less';
@theme-bg: @base-color; // 来自 colors.less

// colors.less
@base-color: #fff;
```
**✨ 插件会自动加载所有三个文件，支持跨文件的变量补全和跳转**

## 🔧 高级功能

### 自动重新加载
修改任何 Less 文件后：
1. 📊 状态栏显示：`$(sync~spin) 重新加载 Less 文件...`
2. 🔄 自动重新解析所有文件
3. ✅ 完成后提示：`$(check) Less 文件已加载 (N 个文件)`

### 智能括号检测
插件会智能判断光标位置，避免在不合适的地方触发补全：
```less
// ✅ 会触发补全
.box {
  color: @|  // 光标位置
}

// ❌ 不会触发补全（在括号内）
.mixin(@color: @|) {  // 避免在参数中误触发
}
```

### Vue 文件智能识别
只在 `<style>` 标签内触发补全：
```vue
<template>
  <div>@|</div>  <!-- ❌ 不触发 -->
</template>

<style lang="less">
.box {
  color: @|  <!-- ✅ 触发补全 -->
}
</style>
```

## 🆚 与原版对比

| 功能 | 原版 | 增强版 |
|------|------|--------|
| Vue SFC 支持 | ❌ | ✅ |
| 递归 @import 加载 | ❌ | ✅ |
| 路径别名 (@/) | ❌ | ✅ |
| 实时文件监听 | 部分 | ✅ 全量 |
| 普通 CSS 类支持 | ❌ | ✅ |
| 智能括号检测 | ❌ | ✅ |
| 工作区配置 | ❌ | ✅ |
| 状态栏提示 | ❌ | ✅ |

## 📝 更新日志

### v0.0.2 (最新)
- ✨ 新增实时文件监听，修改后自动重新加载
- ✨ 监听所有递归导入的 Less 文件
- ✨ 添加状态栏加载提示
- ✨ 初次使用提示增加"不再提示"选项
- ✨ 支持项目级别的提示控制，不影响其他项目

### v0.0.1
- ✨ 添加路径别名 `@/` 支持
- ✨ 实现递归 @import 加载功能
- ✨ 添加循环引用保护
- ✨ 支持普通 CSS 类的自动补全和跳转
- ✨ Vue SFC 中的智能补全（仅在 style 标签内）
- ✨ 智能括号检测，避免误触发
- ✨ 修复重复点号问题
- ✨ 配置保存到工作区而非用户设置
- ✨ 移除重复的更新提示
- ✨ Vue 文件中支持跳转定义

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT

## 🙏 致谢

- 原项目：[easier-less-vue](https://github.com/ADKcodeXD/easier-less)
- Fork 并增强：[easier-less-vue](https://github.com/dmxiaoshubao/easier-less)
