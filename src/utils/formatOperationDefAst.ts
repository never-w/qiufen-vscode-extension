import { FieldNode, Kind, OperationDefinitionNode, SelectionNode } from 'graphql'

type AstNodeType = OperationDefinitionNode | FieldNode
export type NewAstType = AstNodeType & {
  checked: boolean
  key: string
}

export function formatOperationDefAst(ast: AstNodeType, checked: boolean, key: string, path: AstNodeType[] = [], isSelectionSetAction = false) {
  if (!ast) {
    return null
  }

  const newAst = { ...ast } as NewAstType
  newAst.checked = isSelectionSetAction ? checked : newAst.checked

  if (ast.kind === Kind.OPERATION_DEFINITION) {
    newAst.key = ast.operation + ast.name?.value
  }

  if (ast.kind === Kind.FIELD) {
    if (path.length === 1) {
      newAst.key = ast.name.value
    } else {
      const prefix = path
        .map((itm, index) => {
          if (index === 0) {
            return undefined
          }
          return itm.name?.value
        })
        .filter(Boolean)
        .join('')

      newAst.key = prefix + ast.name.value
    }
  }

  if (newAst.key === key) {
    newAst.checked = checked
    if (newAst?.selectionSet) {
      isSelectionSetAction = true
    }
  }

  const newPath = [...path, newAst]
  if (newAst?.selectionSet) {
    newAst.selectionSet.selections = newAst?.selectionSet?.selections?.map((selection) =>
      formatOperationDefAst(selection as FieldNode, checked, key, newPath, isSelectionSetAction),
    ) as SelectionNode[]
  }

  if (newAst?.selectionSet) {
    const flag = (newAst.selectionSet.selections as NewAstType[])?.some((itm) => itm.checked)
    if (flag) {
      newAst.checked = true
    } else {
      newAst.checked = false
    }
  }

  return newAst
}

export function getOperationDefsAstKeys(ast: NewAstType, keys: string[] = []) {
  if (!ast) {
    return []
  }

  if (ast?.checked) {
    keys.push(ast.key)
  }

  if (ast?.selectionSet) {
    ast?.selectionSet?.selections?.forEach((selection) => getOperationDefsAstKeys(selection as NewAstType, keys))
  }

  return keys
}
