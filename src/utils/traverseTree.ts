import { ArgColumnRecord } from "@/webview/components/content/operation-doc"
import { FieldNode, visit } from "graphql"

// TODO 根据自定义指令去得到子集节点keys，暂时后端支持不了
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
export function getDefaultRowKeys(objectFieldsTreeData: ArgColumnRecord[], defaultRowKeys: string[] = [], directive = "") {
  objectFieldsTreeData.forEach((node) => {
    dfsOperationTree(node, defaultRowKeys, false, directive)
  })
}

// 本地回显获取keys
export function visitDocumentNodeAstGetKeys(ast: FieldNode | undefined, keys: string[]) {
  if (!ast) {
    keys = []
    return
  }

  return visit(ast, {
    Field(node, key, parent, path, ancestors) {
      const prefixKey = ancestors
        .filter((_, index) => index % 3 === 0)
        .reduce((pre, cur) => {
          return pre + (cur as FieldNode).name.value
        }, "")
      const nameKey = node.name.value
      const nodeKey = prefixKey + nameKey

      keys.push(nodeKey)
    },
  })
}

// 根据子集节点key获取父级节点key，因为这里的antd表单拿不到半选中状态的父级的，需要自己实现去拿
export function traverseOperationTreeGetParentAndChildSelectedKeys(node: ArgColumnRecord, selectedKeys: string[], path: ArgColumnRecord[] = [], shouldSelectedKeys: string[] = []) {
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
