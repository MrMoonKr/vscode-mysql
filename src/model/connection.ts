/**
 * 하나의 데이터베이스 연결를 나타내는 인터페이스
 */
export interface IConnection {
    readonly host: string;
    readonly user: string;
    readonly password?: string;
    readonly port: string;
    readonly database?: string;
    multipleStatements?: boolean;
    readonly certPath: string;
}
