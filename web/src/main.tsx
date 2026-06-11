import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_BORDER_COLOR, BLOCK_DEFAULT_BORDER_RADIUS, CANVAS_DEFAULT_BACKGROUND } from './utils/constants'
import './styles/global.less'
import App from './App'

const theme = {
  token: {
    colorPrimary: DEFAULT_PRIMARY_COLOR,
    borderRadius: BLOCK_DEFAULT_BORDER_RADIUS,
    fontSize: 14,
    colorBgContainer: CANVAS_DEFAULT_BACKGROUND,
    colorBorder: DEFAULT_BORDER_COLOR,
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
