
import fs from 'fs'
import net from 'net'

import 'babel-polyfill'
import { logs, server  } from '~/package.json'
import { Tail} from 'tail'

const DEFAULT_LOG_PATTEN = 'honey-loggly'

export default class {
    constructor(_conf) {
        this.app_logs = this.constructor.getConfig()
        this.log_streams = this.app_logs.map(_item => {
            _item.streams = new Tail(_item.path)
            return _item
        })
        this.reconnect_times = 0
    }

    /*
     * get log path and options from package.json
     * @params none
     * @return Object
     *
     * */
    static getConfig() {
        if (!logs) {
            console.error('请先在package.json里配置logs路径')
            return false
        }
        let keys = Object.keys(logs)
        let logs_arr = keys.map(_key => {
            let item = {app_name: _key}
            if (typeof logs[_key] === 'string') {
                item.path = logs[_key] 
                item.pattern = DEFAULT_LOG_PATTEN
            } else {
                item = Object.assign(item, logs[_key])
            }
            return item
        })
        logs_arr = logs_arr.filter(_item => {
            let is_exists = fs.existsSync(_item.path) 
            if (!is_exists) {
                console.warn(`${_item.app_name} 配置的日志路径找不到！`)
            }
            return is_exists
        })
        return logs_arr
    }
    
    async _connect() {
        let _ = this
        let conn = new net.Socket
        
        conn.on('error', _err => {
            console.error(_err.code)
        })
        conn.on('close', ()=> {
            console.warn('日志接收服务器失联，2秒后重试...')
            setTimeout(async () => {
                _.connection = await this._connect()
            }, 2000)
        })
        //conn.on('drain', () => {
        //    console.log('drain event')
        //})
        //conn.on('timeout', () => {
        //    console.log('timeout event')
        //})
        //conn.on('end', () => {
        //    console.log('end event')
        //})
        console.log(`连接服务器：${server.host}:${server.port}`)
        await conn.connect(server.port, server.host, () => {
            console.log('日志接收服务器连接成功！')
        })
        return conn
    }

    _send(_msg) {
        this.connection.write(_msg)
        //this.connection.then(_conn => {
        //    _conn.write(_msg)
        //})
    }

    _isTheLog(_pattern, _data) {
        if (_pattern === 'all') return _data
        let escape = `[${_pattern}]`.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
        let re = new RegExp(`^${escape}`)
        if (re.test(_data)) {
            return _data.replace(re, '').replace(/^\s+?/, '') 
        } else return false

    }

    async run() {
        let _ = this
        _.connection = await this._connect()
        _.log_streams.forEach(_item => {
            _item.streams.on('line', _data => {
                let msg = _._isTheLog(_item.pattern, _data)
                if (msg) _._send(msg)
                //if (msg) {
                //    //let msg = `${_item.app_name}: ${_data}`
                //    let msg = _data
                //    //console.log(msg)
                //    _._send(msg)
                //}
            }) 
            _item.streams.on('error', _err => {
                console.warn(`[failed] ${_item.app_name}: ${_data}`)
                console.warn(`[failed detail] ${_item.app_name}: ${_err}`)
            })
        })
    }

    close() {
        this.log_streams.forEach(_item => {
            _item.streams.unwatch()        
        }) 
    }
}
