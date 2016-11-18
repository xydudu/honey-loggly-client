import assert from 'assert'
import fs from 'fs'
import Watcher from '~/src/watcher.js'

describe('honey-log client', () => {

    it('getConfig()', () => {
        let configs = Watcher.getConfig()
        assert(configs)
        assert(configs[0].app_name === 'projectA')
        assert(configs[1].app_name === 'projectB')
        assert(configs[1].path)
    })

    it('_isTheLog()', () => {
        let watcher = new Watcher() 
        let input1 = 'Hello honey-loggly'
        let input2 = '[honey-loggly] Hello honey-loggly'

        let result = watcher._isTheLog('honey-loggly', input1)
        assert.equal(result, false)
        let result2 = watcher._isTheLog('honey-loggly', input2)
        assert.equal(result2, 'Hello honey-loggly')
    
    })

    it('run()', function(done) {
        this.timeout(5000)
        let watcher = new Watcher()
        watcher.run()
        setTimeout(() => {
            fs.appendFileSync('./test/testA.log', 'Hello honey-loggly \n', 'utf8') 
        }, 1000)
        setTimeout(() => {
            fs.appendFileSync('./test/testB.log', 'all Hello honey-loggly To B \n', 'utf8') 
        }, 2000)
        setTimeout(() => {
            fs.appendFileSync('./test/testA.log', '[honey-loggly] Hello honey-loggly To A \n', 'utf8') 
        }, 3000)
        setTimeout(() => {
            fs.appendFileSync('./test/testB.log', 'all Hello honey-loggly To B \n', 'utf8') 
        }, 4000)

        setTimeout(() => {
            watcher.close()        
            fs.writeFileSync('./test/testB.log', 'Hello honey-loggly To B \n', 'utf8') 
            fs.writeFileSync('./test/testA.log', 'Hello honey-loggly To A \n', 'utf8') 
            done()
        }, 4500)

    })

})
