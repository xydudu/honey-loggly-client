
import fs from 'fs'
import net from 'net'
import { logs, server  } from '../package.json'
import { Tail} from 'tail'

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
                item.patten = false
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
        conn.on('error', err => {
            console.warn('日志接收服务器失联，2秒后重试...')
            if (_.reconnect_times > 10) {
                console.error('日志接收服务器可能死了！')
                conn.destroy()
            }
            setTimeout(() => {
                console.log('reconnect server ...') 
                _._connect()
                _.reconnect_times ++
            }, 2000)
        })
        await conn.connect(server.port, server.host, () => {
            console.log('日志接收服务器连接成功！')    
        })
        return conn
    }

    _send() {
         
    }

    run() {
        this.connection = this._connect()
        this.log_streams.forEach(_item => {
            _item.streams.on('line', _data => {
                console.log(`${_item.app_name}: ${_data}`)
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
