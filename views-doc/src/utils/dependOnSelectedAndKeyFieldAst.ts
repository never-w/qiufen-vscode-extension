import { NewFieldNodeType } from './interface'

// 更新节点 checkBox全选、不选中
function updateChecked(node: NewFieldNodeType, checked: boolean) {
  node.checked = checked

  if (node?.children) {
    node.children = node.children.map((child) => updateChecked(child, checked))
  }

  return node
}
/**
 * 用于table select选择时对 operation fieldNode ast tree操作格式化的函数，支持checkBox全选、半选、不选中.
 */
export function dependOnSelectedAndKeyFieldAst(ast: NewFieldNodeType, checked: boolean, key: string) {
  const newAst = { ...ast }

  if (newAst.fieldKey === key) {
    newAst.checked = checked
    if (newAst?.children) {
      newAst.children = newAst?.children?.map((child) => updateChecked(child, checked)) as NewFieldNodeType[]
    }
  } else {
    if (newAst?.children) {
      newAst.children = newAst?.children?.map((child) =>
        dependOnSelectedAndKeyFieldAst(child, checked, key),
      ) as NewFieldNodeType[]
    }
  }

  if (newAst?.children) {
    const flag = newAst?.children?.every((itm) => itm.checked)
    const flag1 = newAst?.children?.some((itm) => itm.checked)

    if (!flag && flag1) {
      newAst.halfChecked = true
      newAst.checked = false
    } else if (flag) {
      newAst.halfChecked = false
      newAst.checked = true
    } else if (!flag1) {
      newAst.halfChecked = false
      newAst.checked = false
    } else {
      newAst.halfChecked = false
      newAst.checked = false
    }
  }

  return newAst
}

/**
 * 根据table ast tree 的 checked 是true的得到keys
 */
export function getFieldNodeAstCheckedIsTrueKeys(ast: NewFieldNodeType, keys: string[] = []) {
  if (ast.checked) {
    keys.push(ast.fieldKey)
  }

  if (ast?.children) {
    ast.children.forEach((child) => {
      getFieldNodeAstCheckedIsTrueKeys(child, keys)
    })
  }

  return keys
}

export function getRenderCheckKeys(ast: NewFieldNodeType, keys: string[] = []) {
  if (ast.checked || ast?.halfChecked) {
    keys.push(ast.fieldKey)
  }

  if (ast?.children) {
    ast.children.forEach((child) => {
      getRenderCheckKeys(child, keys)
    })
  }

  return keys
}

/**
 * 根据本地存在的字段keys，格式化现在远程最新的接口对应的字段key上的checked为true
 */
export function dependOnWorkspaceFieldKeysToFieldAstTree(ast: NewFieldNodeType, selectedKeys: string[]) {
  const newAst = { ...ast }

  if (selectedKeys.includes(newAst.fieldKey)) {
    newAst.checked = true
  }

  if (newAst?.children && selectedKeys.length) {
    newAst.children = newAst.children.map((child) =>
      dependOnWorkspaceFieldKeysToFieldAstTree(child, selectedKeys),
    ) as NewFieldNodeType[]
  }

  return newAst
}
