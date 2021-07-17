// const 

let Core = {
    encode(o) {
        return JSON.stringify(o);
    },
    decode(json, safe) {
        try {
            return JSON.parse(json);
        } catch (e) {
            if (safe) {
                return null;
            }
        }
    }
};

export { Core }

export default {
    ...Core
}