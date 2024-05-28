import * as vscode from "vscode";
import { INode } from "./INode";


/**
 * 하나의 정보를 나타내는 트리노드
 */
export class InfoNode implements INode {

    constructor( private readonly label: string ) {
    }

    public getTreeItem(): vscode.TreeItem {

        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "info",
        };
    }

    public getChildren(): INode[] {
        
        return [];
    }
}
