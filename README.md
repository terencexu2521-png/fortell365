---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 304402200c0f06b271933f4b0cf35325d641d4373911394c4ee411dec82fd88a18f46741022043e0b78a19d5bb79e314b079def569aad96acac9f6de89cd4b5a58048ae6468b
    ReservedCode2: 3045022100d2b00bdaafa66f38bb84af1d6a7b631a0c81474cfb6deeac52476425646d1820022024242d716e60b3667437af746ee24a0a99f7ec9285fb7a3ea7b81cccdafbd3ff
---

# 命理网站 - 专业命理服务平台

这是命理网站Fortell365的前端项目，使用React + TypeScript + Vite构建。

## 功能特点
- 提供专业的命理分析服务
- 支持用户生成报告
- 数据监控和统计分析

## 技术栈
- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (后端服务)

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
