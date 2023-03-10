import { ArgColumnRecord } from '@/components/content/operation-doc'

function dfsOperationTree(node: ArgColumnRecord, selectedKeys: string[], isDirective: boolean, directive: string) {
  // 把没有子节点的节点push进去
  if (!node?.children?.length && !isDirective) {
    // 是否存在配置的自定义指令
    const tmpIsDirective = !!node.directives?.find((itm) => itm.name.value === directive)
    if (!tmpIsDirective) {
      selectedKeys.push(node.key)
    }
  } else {
    const tmpIsDirective = !!node.directives?.find((itm) => itm.name.value === directive)
    // 当前这个节点不包含fetchField指令才去遍历它的子节点
    if (!tmpIsDirective) {
      node?.children?.forEach((child: ArgColumnRecord) => {
        dfsOperationTree(child, selectedKeys, tmpIsDirective, directive)
      })
    }
  }
}

export function getDefaultRowKeys(
  objectFieldsTreeData: ArgColumnRecord[],
  defaultRowKeys: string[] = [],
  directive = '',
) {
  objectFieldsTreeData.forEach((node) => {
    dfsOperationTree(node, defaultRowKeys, false, directive)
  })
}

export function traverseOperationTreeGetParentAndChildSelectedKeys(
  node: ArgColumnRecord,
  selectedKeys: string[],
  path: ArgColumnRecord[] = [],
  shouldSelectedKeys: string[] = [],
) {
  const parentKeys = path?.map((pathItm) => pathItm.key)
  path.push(node)

  if (selectedKeys.includes(node.key)) {
    shouldSelectedKeys.push(...parentKeys, node.key)
  }

  node?.children?.forEach((child: ArgColumnRecord) => {
    traverseOperationTreeGetParentAndChildSelectedKeys(child, selectedKeys, path, shouldSelectedKeys)
  })
  path.pop()
}
