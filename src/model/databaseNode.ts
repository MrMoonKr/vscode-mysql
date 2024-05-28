import * as fs from "fs";
import * as mysql from "mysql";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "../common/appInsightsClient";
import { Global } from "../common/global";
import { Utility } from "../common/utility";
import { InfoNode } from "./infoNode";
import { INode } from "./INode";
import { TableNode } from "./tableNode";


/**
 * 하나의 데이터베이스를 표현하는 트리노드
 */
export class DatabaseNode implements INode {

    /**
     * 
     * @param host 호스트 주소
     * @param user 사용자 계정
     * @param password 사용자 암호
     * @param port 포트 번호
     * @param database 데이터베이스 이름
     * @param certPath 인증서 경로
     */
    constructor( private readonly host: string,
        private readonly user: string,
        private readonly password: string, 
        private readonly port: string, 
        private readonly database: string,
        private readonly certPath: string ) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.database,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "database",
            iconPath: path.join( __filename, "..", "..", "..", "resources", "database.svg" ),
        };
    }

    public async getChildren(): Promise<INode[]> {

        const connection = Utility.createConnection( {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        } );

        return Utility.queryPromise<any[]>( connection, 
            `SELECT TABLE_NAME FROM information_schema.TABLES  WHERE TABLE_SCHEMA = '${ this.database }' LIMIT ${ Utility.maxTableCount }` 
            )
            .then( ( tables ) => {
                return tables.map<TableNode>( ( table ) => {
                    return new TableNode( this.host, this.user, this.password, this.port, this.database, table.TABLE_NAME, this.certPath );
                } );
            } )
            .catch( ( err ) => {
                return [ new InfoNode( err ) ];
            } );
    }

    public async newQuery() {
        AppInsightsClient.sendEvent( "newQuery", { viewItem: "database" } );
        Utility.createSQLTextDocument();

        Global.activeConnection = {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        };
    }
}
