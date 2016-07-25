const client = 'https://authentication.x-speed.cc/minecraft/versions/<version>.jar';

const versions = 'https://authentication.x-speed.cc/minecraft/versions/list.json';

const libraries    = 'https://libraries.minecraft.net';
const librariesCN  = 'https://authentication.x-speed.cc/minecraft/libraries';

module.exports = {

    /* 获取客户端Jar URL */
    getClientUrl(version){
        return client.replace(/<version>/g, version);
    },

    /* 获取版本列表URL */
    getVersionsUrl(){
        return versions;
    },

    /* 获取Java依赖库URL */
    getLibrariesForChinaUser(url){
        return url.replace(libraries, librariesCN);
    },
}
