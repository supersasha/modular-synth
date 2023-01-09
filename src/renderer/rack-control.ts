const rackIpc = window.electron.rackIpc;

class RackControl {
    start() {
        rackIpc('start');
    }

    stop() {
        rackIpc('stop');
    }

    pause() {
        rackIpc('pause');
    }

    resume() {
        rackIpc('resume');
    }

    module(name: string, ...args: any[]): any {
        return rackIpc('module', name, ...args);
    }
}

export const rackControl = new RackControl();
