import React, { FC } from 'react'

interface IProps {}

const NoMatch: FC<IProps> = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        color: 'red',
        paddingTop: 200,
        height: 'calc(100vh - 200px)',
        backgroundColor: '#fff',
        fontWeight: 'bold',
      }}
    >
      报错啦 404...
    </div>
  )
}

export default NoMatch
