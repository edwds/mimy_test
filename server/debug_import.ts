
import fetch from 'node-fetch';

async function testFetch() {
    const url = 'https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/fb1ea6cd3aa044deb15f2159798b857e/bookmarks?start=0&limit=1000&sort=lastUseTime&mcids=ALL&createIdNo=true';

    console.log('Testing Fetch without headers...');
    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        console.log('Headers:', res.headers.raw());
        const text = await res.text();
        console.log('Body:', text.slice(0, 500));
    } catch (e) {
        console.error('Fetch 1 failed:', e);
    }

    console.log('\n---------------------------------\n');

    console.log('Testing Fetch with User-Agent and Referer...');
    try {
        const res2 = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://map.naver.com/',
                'Origin': 'https://map.naver.com',
                'Host': 'pages.map.naver.com'
            }
        });
        console.log('Status:', res2.status);
        const text2 = await res2.text();
        console.log('Body:', text2.slice(0, 500));
    } catch (e) {
        console.error('Fetch 2 failed:', e);
    }
}

testFetch();
