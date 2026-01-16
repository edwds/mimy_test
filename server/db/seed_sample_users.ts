
import { db } from './index';
import { users } from './schema';
import CLUSTER_DATA from '../data/cluster.json';

const TARGET_CLUSTERS = [
    { id: 62, vector: "-2,0,-1,0,-1,2,-1" }, // 심플한 설탕
    { id: 68, vector: "0,-2,1,1,2,-1,-2" }, // 매콤한 크림파스타
    { id: 22, vector: "-1,0,0,-2,-1,-2,-1" }, // 안전제일주의자
    { id: 122, vector: "-2,-1,2,-1,2,-1,1" }, // 얼큰한 곰탕
    { id: 59, vector: "-2,1,0,1,1,2,2" }, // 복합적인 별미
    { id: 37, vector: "1,-2,1,1,1,2,-1" }, // 매콤달콤 기름떡볶이
    { id: 29, vector: "0,0,0,2,1,2,-2" }, // 달콤한 불장난
    { id: 111, vector: "0,-2,2,2,2,-2,2" }, // 묵직한 마라탕
    { id: 11, vector: "-1,-2,2,-1,-2,-2,2" }, // 담백한 사골
    { id: 10, vector: "-2,-2,2,-2,-1,2,-1" }, // 달콤한 버터케익
    { id: 106, vector: "-2,-1,2,-1,-1,-1,0" }, // 심심한 뚝배기
    { id: 67, vector: "0,-1,2,-2,-1,0,2" }, // 진득한 보양식
    { id: 74, vector: "1,-2,2,-2,1,-1,0" }, // 진한 고기국물
    { id: 117, vector: "2,-2,1,1,0,0,2" }, // 진한 사골국물
    { id: 84, vector: "0,0,1,1,1,1,-2" }, // 이색적인 로제
    { id: 110, vector: "0,-2,2,1,-1,-1,-2" }, // 느끼한 실험가
    { id: 124, vector: "-1,0,2,0,1,2,0" }, // 달콤한 헤비급
    { id: 86, vector: "-1,1,2,1,-2,1,1" }, // 부드러운 치즈케이크
    { id: 52, vector: "1,-1,2,1,0,-1,1" }, // 진지한 미식가
    { id: 92, vector: "-1,2,2,2,0,1,2" }, // 풍요로운 퓨전
];

const AXIS_ORDER = [
    'boldness',
    'acidity',
    'richness',
    'experimental',
    'spiciness',
    'sweetness',
    'umami'
];

// Korean Name Parts
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const FIRST_NAMES_M = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '주원', '지후', '준우', '은우', '도현', '연우', '건우', '우진', '현우', '시윤', '동현'];
const FIRST_NAMES_F = ['서연', '서윤', '지우', '서현', '하은', '서아', '지아', '서우', '민서', '다은', '예은', '수아', '지민', '지유', '예지', '아린', '하율', '시아'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomPhone() {
    // 010-xxxx-xxxx
    const part2 = Math.floor(Math.random() * 9000) + 1000;
    const part3 = Math.floor(Math.random() * 9000) + 1000;
    return `010-${part2}-${part3}`;
}

// Simple romanization for ID generation (very basic)
function romanize(name: string): string {
    const table: Record<string, string> = {
        '김': 'kim', '이': 'lee', '박': 'park', '최': 'choi', '정': 'jung', '강': 'kang', '조': 'cho', '윤': 'yoon', '장': 'jang', '임': 'lim',
        '민': 'min', '서': 'seo', '준': 'jun', '도': 'do', '예': 'ye', '시': 'si', '우': 'woo', '하': 'ha', '지': 'ji', '호': 'ho', '주': 'ju', '원': 'won', '후': 'hu', '현': 'hyun', '연': 'yeon', '건': 'geon', '동': 'dong',
        '다': 'da', '은': 'eun', '아': 'a', '린': 'rin', '율': 'yul', '유': 'yu'
    };
    let res = "";
    for (const char of name) {
        res += table[char] || 'x';
    }
    return res;
}

async function seedSampleUsers() {
    console.log("Seeding 20 sample users...");

    for (let i = 0; i < TARGET_CLUSTERS.length; i++) {
        const target = TARGET_CLUSTERS[i];
        const clusterInfo = CLUSTER_DATA.find(c => parseInt(c.cluster_id) === target.id);

        if (!clusterInfo) {
            console.error(`Cluster ID ${target.id} not found in cluster.json`);
            continue;
        }

        // Generate profile
        const isMale = Math.random() > 0.5;
        const lastName = getRandomItem(LAST_NAMES);
        const firstName = getRandomItem(isMale ? FIRST_NAMES_M : FIRST_NAMES_F);
        const fullName = lastName + firstName;

        const gender = isMale ? 'M' : 'F';
        const romanName = romanize(fullName);
        const idSuffix = Math.floor(Math.random() * 1000); // reduced chance of collision
        const accountId = `${romanName}${idSuffix}`; // e.g. kimminjun123
        const email = `${accountId}@sample.com`; // Dummy email
        const phone = generateRandomPhone();

        // Date of birth (random age 20-35)
        const year = 1990 + Math.floor(Math.random() * 15);
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const birthdate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Build Taste Result
        // Parse vector string to scores
        const vectorValues = target.vector.split(',').map(Number);
        const scores: Record<string, number> = {};
        AXIS_ORDER.forEach((axis, idx) => {
            scores[axis] = vectorValues[idx] || 0;
        });

        const tasteResult = {
            scores: scores,
            clusterId: target.id,
            clusterData: {
                cluster_id: String(target.id),
                cluster_name: clusterInfo.cluster_name,
                cluster_tagline: clusterInfo.cluster_tagline
            }
        };

        // Insert
        try {
            await db.insert(users).values({
                channel: 0, // default Google/Mock
                email: email,
                phone: phone,
                phone_country: "82",
                phone_verified: true,
                account_id: accountId,
                nickname: fullName, // Use Korean name as nickname
                bio: `${clusterInfo.cluster_name} 스타일의 미식가입니다.`,
                visible_rank: 100,
                birthdate: birthdate, // string or date object? schema says date(string) usually works
                gender: gender,
                taste_cluster: String(target.id),
                taste_result: tasteResult,
                created_at: new Date(),
                updated_at: new Date()
            });
            console.log(`Created user: ${fullName} (${accountId}) - Cluster: ${clusterInfo.cluster_name}`);
        } catch (e) {
            console.error(`Failed to create user ${fullName}:`, e);
        }
    }
    console.log("Done.");
}

seedSampleUsers()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
