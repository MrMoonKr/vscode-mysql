"use strict";

import * as asciitable from "asciitable";
import * as fs from "fs";
import * as mysql from "mysql";
import * as vscode from "vscode";
import { IConnection } from "../model/connection";
import { SqlResultWebView } from "../sqlResultWebView";
import { AppInsightsClient } from "./appInsightsClient";
import { Global } from "./global";
import { OutputChannel } from "./outputChannel";


export class Utility {

    public static readonly maxTableCount = Utility.getConfiguration().get<number>( "maxTableCount" );

    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration( "vscode-mysql" );
    }

    public static queryPromise<T>( connection, sql: string ): Promise<T> {
        return new Promise( ( resolve, reject ) => {
            connection.query( sql, ( err, rows ) => {
                if ( err ) {
                    reject( "Error: " + err.message );
                } else {
                    resolve( rows );
                }
            } );
            connection.end();
        } );
    }

    // Remove MySQL instructions: DELIMITER
    public static removeDelimiterInstructions( sql: string ) {
        if ( !sql.search( /delimiter/i ) ) {
            return sql;
        }
        const rc = new RegExp( /(?<!--\s+.*)(delimiter\s+(\S+))/gi );
        let currentDelimiter = ";";
        let nextPosition = 0;
        let result = "";
        let a;

        while ( Boolean( a = rc.exec( sql ) ) ) {
            result += ( currentDelimiter === ";" )
                ? sql.slice( nextPosition, a.index )
                : sql.slice( nextPosition, a.index ).replace( new RegExp( currentDelimiter, "g" ), ";" );
            nextPosition = a.index + a[ 1 ].length;
            currentDelimiter = a[ 2 ];
        }
        result += ( currentDelimiter === ";" )
            ? sql.slice( nextPosition )
            : sql.slice( nextPosition ).replace( new RegExp( currentDelimiter, "g" ), ";" );
        return result;
    }

    public static async runQuery( sql?: string, connectionOptions?: IConnection ) {
        AppInsightsClient.sendEvent( "runQuery.start" );
        if ( !sql && !vscode.window.activeTextEditor ) {
            vscode.window.showWarningMessage( "No SQL file selected" );
            AppInsightsClient.sendEvent( "runQuery.noFile" );
            return;
        }
        if ( !connectionOptions && !Global.activeConnection ) {
            const hasActiveConnection = await Utility.hasActiveConnection();
            if ( !hasActiveConnection ) {
                vscode.window.showWarningMessage( "No MySQL Server or Database selected" );
                AppInsightsClient.sendEvent( "runQuery.noMySQL" );
                return;
            }
        }

        if ( !sql ) {
            const activeTextEditor = vscode.window.activeTextEditor;
            const selection = activeTextEditor.selection;
            if ( selection.isEmpty ) {
                sql = activeTextEditor.document.getText();
            } else {
                sql = activeTextEditor.document.getText( selection );
            }
        }

        connectionOptions = connectionOptions ? connectionOptions : Global.activeConnection;
        connectionOptions.multipleStatements = true;
        const connection = Utility.createConnection( connectionOptions );

        if ( this.getConfiguration().get<boolean>( "enableDelimiterOperator" ) ) {
            sql = this.removeDelimiterInstructions( sql );
        }

        OutputChannel.appendLine( "[Start] Executing MySQL query..." );
        connection.query( sql, ( err, rows ) => {
            if ( Array.isArray( rows ) ) {
                if ( rows.some( ( ( row ) => Array.isArray( row ) ) ) ) {
                    rows.forEach( ( row, index ) => {
                        if ( Array.isArray( row ) ) {
                            Utility.showQueryResult( row, "Results " + ( index + 1 ) );
                        } else {
                            OutputChannel.appendLine( JSON.stringify( row ) );
                        }
                    } );
                } else {
                    Utility.showQueryResult( rows, "Results" );
                }

            } else {
                OutputChannel.appendLine( JSON.stringify( rows ) );
            }

            if ( err ) {
                OutputChannel.appendLine( err.message );
                AppInsightsClient.sendEvent( "runQuery.end", { Result: "Fail", ErrorMessage: err.message } );
            } else {
                AppInsightsClient.sendEvent( "runQuery.end", { Result: "Success" } );
            }
            OutputChannel.appendLine( "[Done] Finished MySQL query." );
        } );
        connection.end();
    }

    public static async createSQLTextDocument( sql: string = "" ) {
        const textDocument = await vscode.workspace.openTextDocument( { content: sql, language: "sql" } );
        return vscode.window.showTextDocument( textDocument );
    }

    public static createConnection( connectionOptions: IConnection ): mysql.Connection {

        //const newConnectionOptions: any = Object.assign( {}, connectionOptions );
        const newConnectionOptions: mysql.ConnectionConfig = {
            host: connectionOptions.host,
            user: connectionOptions.user,
            password: connectionOptions.password,
            port: parseInt( connectionOptions.port, 10 ),
            database: connectionOptions.database,
            multipleStatements: true,
        };

        if ( connectionOptions.certPath && fs.existsSync( connectionOptions.certPath ) ) {
            newConnectionOptions.ssl = {
                ca: fs.readFileSync( connectionOptions.certPath ),
            };
        }
        return mysql.createConnection( newConnectionOptions );
    }

    private static getPreviewUri( data ) {
        const uri = vscode.Uri.parse( "sqlresult://mysql/data" );

        return uri.with( { query: data } );
    }

    private static showQueryResult( data, title: string ) {
        // vscode.commands.executeCommand(
        //     "vscode.previewHtml",
        //     Utility.getPreviewUri(JSON.stringify(data)),
        //     vscode.ViewColumn.Two,
        //     title).then(() => { }, (e) => {
        //         OutputChannel.appendLine(e);
        //     });
        SqlResultWebView.show( data, title );
    }

    private static async hasActiveConnection(): Promise<boolean> {
        let count = 5;
        while ( !Global.activeConnection && count > 0 ) {
            await Utility.sleep( 100 );
            count--;
        }
        return !!Global.activeConnection;
    }

    private static sleep( ms ) {
        return new Promise( ( resolve ) => {
            setTimeout( resolve, ms );
        } );
    }
}
