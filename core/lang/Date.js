let obj = {
    pad(num) {
        return ("0" + num).slice(-2);
    },
    secsTommssmin(seconds) {
        let minutes = Math.floor(seconds / 60);
        let restSeconds = seconds % 60;
        return (
            `${minutes}m` + (restSeconds > 0 ? `${restSeconds.toFixed(0)}s` : "")
        );
    },
    secsTommssext(seconds) {
        let minutes = Math.floor(seconds / 60);
        let restSeconds = seconds % 60;
        // console.log(minutes)
        return `${minutes === 0 || minutes < 10 ? "0" + minutes : minutes} min. ` + (restSeconds > 0 ? `${restSeconds.toFixed(0)} seg. ` : "");
    },
    hhTommss(secs) {
        let minutes = Math.floor(secs / 60);
        secs = secs.toFixed(0) % 60;
        let hours = Math.floor(minutes / 60)
        minutes = minutes % 60;
        return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(secs)}`;
    },
    formatDMY(date) {
        if (!date) {
            return;
        }
        var dd = date.getDate();
        var mm = date.getMonth() + 1;
        var yyyy = date.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        return dd + '-' + mm + '-' + yyyy;
    },
    addHours(date, hours) {
        let parts = hours.split(":");
        date.setHours(parts[0]);
        date.setMinutes(parts[1]);
        if (parts[2]) {
            date.setSeconds(parts[2]);
        } else {
            date.setSeconds(0);
        }
        date.setMilliseconds(0);
    },
    getExecTime(time) {
        var curDate = new Date();
        var curHours = curDate.getHours();
        var curMin = curDate.getMinutes();
        var curSec = curDate.getSeconds();

        let splitTime = time.split(":");

        let timeTask = new Date();
        timeTask.setHours(splitTime[0]);
        timeTask.setMinutes(splitTime[1]);
        timeTask.setSeconds(splitTime[2]);

        var tHours = timeTask.getHours();
        var tMin = timeTask.getMinutes();
        var tSec = timeTask.getSeconds();

        var curMilli = ((curHours * 60 * 60) * 1000) + ((curMin * 60) * 1000) + (curSec * 1000);
        var tMilli = ((tHours * 60 * 60) * 1000) + ((tMin * 60) * 1000) + (tSec * 1000);

        if (curMilli < tMilli) {
            return tMilli - curMilli;
        } else {
            var full24 = ((24 * 60 * 60) * 1000);
            var timeNewDate = full24 - curMilli;
            return timeNewDate + tMilli;
        }
    }
};
export default obj;