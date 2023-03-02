import { ArgColumnRecord } from "@/webview/components/content/operation-doc"

function dfs(node: ArgColumnRecord, selectedKeys: string[] = [], isDirective: boolean) {
  // 把没有子节点的节点push进去
  if (!node?.children?.length && !isDirective) {
    const tmpIsDirective = !!node.directives?.find((itm) => itm.name.value === "fetchField")
    if (!tmpIsDirective) {
      selectedKeys.push(node.key)
    }
  } else {
    const tmpIsDirective = !!node.directives?.find((itm) => itm.name.value === "fetchField")
    // 当前这个节点不包含fetchField指令才去遍历它的子节点
    if (!tmpIsDirective) {
      node?.children?.forEach((child: ArgColumnRecord) => {
        dfs(child, selectedKeys, tmpIsDirective)
      })
    }
  }
}

export function getDefaultRowKeys(objectFieldsTreeData: ArgColumnRecord[], defaultRowKeys: string[] = []) {
  objectFieldsTreeData.forEach((node) => {
    dfs(node, defaultRowKeys, false)
  })
}

function traverseTree(node: ArgColumnRecord, selectedKeys: string[], path: ArgColumnRecord[] = [], shouldSelectedKeys: string[] = []) {
  const parentKeys = path?.map((pathItm) => pathItm.key)
  path.push(node)

  if (selectedKeys.includes(node.key)) {
    shouldSelectedKeys.push(...parentKeys, node.key)
  }

  node?.children?.forEach((child: ArgColumnRecord) => {
    traverseTree(child, selectedKeys, path, shouldSelectedKeys)
  })
  path.pop()
}

export default traverseTree
