import { FieldNode, Kind, OperationDefinitionNode, SelectionNode } from "graphql";

type AstNodeType = OperationDefinitionNode | FieldNode
type NewAstType = AstNodeType & {
    flag: boolean
    key: string
}


export function addCheckedToOperationDefAst(ast: OperationDefinitionNode | FieldNode, path: AstNodeType[] = []) {
    if (!ast) {
        return null;
    }

    const newAst = { ...ast } as NewAstType
    newAst.flag = true;

    if (ast.kind === Kind.OPERATION_DEFINITION) {
        newAst.key = ast.operation + ast.name?.value
    }

    if (ast.kind === Kind.FIELD) {
        if (path.length === 1) {
            newAst.key = ast.name.value
        } else {
            const prefix = path.map((itm, index) => {
                if (index === 0) {
                    return undefined
                }
                return itm.name?.value
            }).filter(Boolean).join("")

            newAst.key = prefix + ast.name.value
        }
    }

    const newPath = [...path, newAst];

    if (newAst?.selectionSet) {
        newAst.selectionSet.selections = newAst?.selectionSet?.selections?.map((selection) => addCheckedToOperationDefAst(selection as FieldNode, newPath)
        ) as SelectionNode[]
    }


    return newAst;
}