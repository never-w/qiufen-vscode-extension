import React, { FC, useState } from 'react'
import styles from './index.module.less'
import logo from '@/assets/images/logo.png'
import { FileOutlined, HomeTwoTone, HomeOutlined, FileTwoTone } from '@ant-design/icons'
import classnames from 'classnames'

interface IProps {
  sideBarActiveKey: SideBarIconKey
  setSideBarActiveKey: (val: SideBarIconKey) => void
  children: React.ReactNode
}

export enum SideBarIconKey {
  HOME = 'HOME',
  DOCS = 'DOCS',
  NONE = 'NONE',
}

const Layout: FC<IProps> = ({ sideBarActiveKey, setSideBarActiveKey, children }) => {
  const [focusKey, setFocusKey] = useState(SideBarIconKey.DOCS)

  return (
    <div>
      <div className={styles.topBar}>
        <img src={logo} alt="qiufen logo" className={styles.logo} />
        <p className={styles.title}>QIUFEN</p>
      </div>
      <div className={styles.section}>
        <div className={styles.sideBar}>
          <div
            onMouseEnter={() => {
              setFocusKey(SideBarIconKey.HOME)
            }}
            onMouseLeave={() => {
              setFocusKey(SideBarIconKey.NONE)
            }}
            onClick={() => {
              setSideBarActiveKey(SideBarIconKey.HOME)
            }}
            className={classnames(styles.icon_item, {
              [styles.active]: sideBarActiveKey === SideBarIconKey.HOME || focusKey === SideBarIconKey.HOME,
            })}
          >
            {sideBarActiveKey === SideBarIconKey.HOME || focusKey === SideBarIconKey.HOME ? (
              <HomeTwoTone className={styles.icon} />
            ) : (
              <HomeOutlined className={styles.icon} />
            )}
          </div>

          <div
            onMouseEnter={() => {
              setFocusKey(SideBarIconKey.DOCS)
            }}
            onMouseLeave={() => {
              setFocusKey(SideBarIconKey.NONE)
            }}
            onClick={() => {
              setSideBarActiveKey(SideBarIconKey.DOCS)
            }}
            className={classnames(styles.icon_item, {
              [styles.active]: sideBarActiveKey === SideBarIconKey.DOCS || focusKey === SideBarIconKey.DOCS,
            })}
          >
            {sideBarActiveKey === SideBarIconKey.DOCS || focusKey === SideBarIconKey.DOCS ? (
              <FileTwoTone className={styles.icon} />
            ) : (
              <FileOutlined className={styles.icon} />
            )}
          </div>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}

export default Layout
