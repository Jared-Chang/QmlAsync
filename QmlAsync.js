function promiseDo(action, ...argumentList/*last two arguments is signal, its handler*/) {
    const [responseSignal, handler] = argumentList.splice(argumentList.length - 2, 2)
    const parameters = argumentList

    if ((typeof responseSignal !== "function") || (typeof handler !== "function")) {
        throw "You must pass signal and handler"
    }

    if (!parent) {
        throw "promise need one parent for destructor"
    }

    let createDestructor = (parent, disconnectSignal) => {
        Qt.createQmlObject("import QtQuick 2.13; QtObject { signal destruction; Component.onDestruction: destruction() }", parent)
          .destruction.connect(disconnectSignal)
    }

    return new FinallyPromise((resolve, reject) => {
        let bindedHandler = handler.bind(null, resolve, reject)
        let disconnectSignalAfterHandled = (...arguments) => {
            bindedHandler.apply(null, arguments)
            responseSignal.disconnect(disconnectSignalAfterHandled)
        }
        createDestructor(parent, () => responseSignal.disconnect(disconnectSignalAfterHandled))

        responseSignal.connect(disconnectSignalAfterHandled)
        action.apply(null, parameters)
    })
}

class FinallyPromise {
    constructor(action, promise = null) {
        if (promise !== null) {
            this.promise = promise
        }
        else {
            this.promise = new Promise(action)
        }
        this.promiseReturn = this.promise
    }

    then(handler) {
        this.promiseReturn = this.promiseReturn.then(handler)
        return this
    }

    catch(handler) {
        this.promiseReturn = this.promiseReturn.catch(handler)
        return this
    }

    finally(handler) {
        FinallyPromise.all([this.promise]).then(handler).catch(handler)
        return this
    }

    static race(iterable) {
        return new FinallyPromise(null, Promise.race(iterable))
    }

    static all(iterable) {
        return new FinallyPromise(null, Promise.all(iterable))
    }

    static allSettled(iterable) {
        return new FinallyPromise(null, Promise.allSettled(iterable))
    }

    static resolve(value) {
        return new FinallyPromise(null, Promise.resolve(value))
    }

    static reject(value) {
        return new FinallyPromise(null, Promise.reject(value))
    }
}
