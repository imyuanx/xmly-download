const fs = require('fs');
const axios = require("axios");
const CryptoJS = require("crypto-js");
const { key, cookie, albumId, mediaType, output } = require("./config-local");

const SUFFIX = ['M4A_64', 'M4A_24'].includes(mediaType) ? "m4a" : "mp3";

/**
 * @desc 解密url
 * @param {String} ciphertext 密文url
 * @returns 明文url
 */
function decryptUrl(ciphertext) {
    return CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Base64url.parse(ciphertext) },
        CryptoJS.enc.Hex.parse(key),
        {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        }
    ).toString(CryptoJS.enc.Utf8);
}

/**
 * @desc 获取专辑列表
 * @param {Number} pageNum 
 */
function getTracksList(pageNum = 1) {
    var config = {
        method: "get",
        url: `https://www.ximalaya.com/revision/album/v1/getTracksList?albumId=${albumId}&pageNum=${pageNum}&pageSize=100`,
        headers: {
            authority: "www.ximalaya.com",
            accept: "*/*",
            "accept-language": "zh-CN,zh;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            cookie: cookie,
            dnt: "1",
            pragma: "no-cache",
            referer: `https://www.ximalaya.com/album/${albumId}`,
            "sec-ch-ua": '"Chromium";v="105", "Not)A;Brand";v="8"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
        },
    };

    return axios(config);
}

/**
 * @desc 获取专辑所有内容
 * @param {Number} pageNum 开始页数
 * @returns 
 */
async function getTracksListAll(pageNum = 1) {
    let {
        data: {
            data: { tracks: tracksList },
        },
    } = await getTracksList(pageNum);
    if (tracksList.length > 0) {
        const nextTracksList = await getTracksListAll(++pageNum);
        tracksList = [...tracksList, ...nextTracksList];
    }
    return tracksList;
}

/**
 * @desc 获取音频详情
 * @param {String} trackId 
 * @returns 
 */
function getTrackInfo(trackId) {
    var config = {
        method: "get",
        url: `https://mobile.ximalaya.com/mobile-playpage/track/v3/baseInfo/${new Date().getTime()}?device=web&trackId=${trackId}&trackQualityLevel=1`,
        headers: {
            authority: "mobile.ximalaya.com",
            accept: "*/*",
            "accept-language": "zh-CN,zh;q=0.9",
            "cache-control": "no-cache",
            cookie: cookie,
            dnt: "1",
            origin: "https://www.ximalaya.com",
            pragma: "no-cache",
            referer: "https://www.ximalaya.com/",
            "sec-ch-ua": '"Chromium";v="105", "Not)A;Brand";v="8"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
        },
    };
    return axios(config);
}

/**
 * @desc 下载到本地
 * @param {String} playUrl 
 * @param {String} filename 
 */
function downloadMedia(playUrl, filename) {

    const stream = fs.createWriteStream(filename);
    axios.get(playUrl, {
        responseType: 'arraybuffer'
    }).then((res) => {
        const arraybuffer = Buffer.from(res.data);
        stream.write(arraybuffer)
        stream.close();
    }, (err) => {
        console.log("下载错误",filename);
    });

}

function clearTitle(title){
    title = title.replaceAll(":","");
    title = title.replace(/【.*】/g, "");
    title = title.replace(/《.*》/g, "");
    title = title.replace(/（.*?）/g, "");
    title = title.replace(/新书搜索.*?》/g, "");
    title = title.replace('_新书搜索', "");
    title = title.replace('新书搜索', "");

    title = title.trim();
    title = title.replaceAll(" ","_")
    
    return title;
}

async function main() {
    const tracksList = await getTracksListAll(24);
    for (const tarckData of tracksList) {
        const { trackId, title } = tarckData;
        const title2 = await clearTitle(title);
        const filename= `${output}/${title2}.${SUFFIX}`
        if (!fs.existsSync(filename)) {
            console.log("文件不存在", filename);
            const { data: { trackInfo: { playUrlList } } } = await getTrackInfo(trackId);
                    let { url: playUrl } = playUrlList.find(playUrl => playUrl.type == mediaType);
                    playUrl = decryptUrl(playUrl);
                    console.log(playUrl);
                    downloadMedia(playUrl, filename);
        }else{
            console.log("文件存在", filename);
        }

    }
    console.log("success");
}


main();
