import { FieldNode, InlineFragmentNode, SelectionNode } from 'graphql'

// 递归更新本地AST
export function updateWorkspaceGql(localNode: FieldNode | InlineFragmentNode, remoteNode: FieldNode | InlineFragmentNode): FieldNode | InlineFragmentNode | null {
  if (localNode.kind === 'Field' && remoteNode.kind === 'Field') {
    if (localNode.name.value !== remoteNode.name.value) {
      return null
    }

    ;(localNode as any).alias = localNode.alias || remoteNode.alias
  }

  if (localNode.selectionSet && remoteNode.selectionSet) {
    localNode.selectionSet.selections = localNode.selectionSet.selections
      .map((localSelection) => {
        const remoteSelection = remoteNode.selectionSet!.selections.find(
          (remoteSelection) => (remoteSelection as FieldNode).name.value === (localSelection as FieldNode).name.value,
        )
        if (!remoteSelection) {
          return null
        }
        return updateWorkspaceGql(localSelection as FieldNode, remoteSelection as FieldNode)
      })
      .filter((selection) => selection !== null) as SelectionNode[]
  }

  return localNode
}

// 更新本地AST
// const updatedLocalAst: DocumentNode = updateAst(localAst, remoteAst) as DocumentNode

// // 将AST转换回查询字符串
// const updatedLocalQuery: string = print(updatedLocalAst)
// console.log(updatedLocalQuery)
