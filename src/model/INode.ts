import * as vscode from "vscode";


/**
 * 사용자용 트리형 자료구조의 노드 표현
 */
export interface INode {

    getTreeItem(): Promise<vscode.TreeItem> | vscode.TreeItem;

    getChildren(): Promise<INode[]> | INode[];
}
