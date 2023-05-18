import React, { FC, useLayoutEffect, useState } from 'react'
import styles from './index.module.less'
import logo from '@/assets/images/logo.png'
import { FileOutlined, HomeTwoTone, HomeOutlined, FileTwoTone } from '@ant-design/icons'
import classnames from 'classnames'
import { Link, Outlet, useLocation } from 'react-router-dom'

interface IProps {}

export enum SideBarIconKey {
  HOME = 'HOME',
  DOCS = 'DOCS',
  NONE = 'NONE',
}

const KEY_MAP: Record<string, SideBarIconKey> = {
  home: SideBarIconKey.HOME,
  docs: SideBarIconKey.DOCS,
  none: SideBarIconKey.NONE,
}

const Layout: FC<IProps> = () => {
  const location = useLocation()
  const key = location.pathname.split('/')[1]

  const [sideBarActiveKey, setSideBarActiveKey] = useState(KEY_MAP[key])
  const [focusKey, setFocusKey] = useState(KEY_MAP[key])

  useLayoutEffect(() => {
    setSideBarActiveKey(KEY_MAP[key])
  }, [key, location.pathname])

  return (
    <div>
      <div className={styles.topBar}>
        <img src={logo} alt="qiufen logo" className={styles.logo} />
        <p className={styles.title}>QIUFEN</p>
      </div>
      <div className={styles.section}>
        <div className={styles.sideBar}>
          <Link to="/docs">
            <div
              onMouseEnter={() => {
                setFocusKey(SideBarIconKey.DOCS)
              }}
              onMouseLeave={() => {
                setFocusKey(SideBarIconKey.NONE)
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
          </Link>

          {/* ----------- */}
          <Link to="/home">
            <div
              onMouseEnter={() => {
                setFocusKey(SideBarIconKey.HOME)
              }}
              onMouseLeave={() => {
                setFocusKey(SideBarIconKey.NONE)
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
          </Link>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
