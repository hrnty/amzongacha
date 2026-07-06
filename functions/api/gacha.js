export async function onRequest(context) {
  // Cloudflareの環境変数から情報を取得
  const clientId = context.env.AMAZON_CLIENT_ID;
  const clientSecret = context.env.AMAZON_CLIENT_SECRET;
  const partnerTag = context.env.AMAZON_PARTNER_TAG || "yourtag-20"; // ご自身のアソシエイトタグに変更推奨
  
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "サーバーの設定エラー：APIキーがありません" }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // ----------------------------------------------------
    // STEP 1: クライアントIDとシークレットを使ってアクセストークンを取得
    // ----------------------------------------------------
    // ※ エンドポイントは標準的なAmazon OAuth2トークンURLを指定しています
    const tokenEndpoint = "https://api.amazon.com/auth/o2/token";
    const credentials = btoa(`${clientId}:${clientSecret}`); // Base64エンコード

    const tokenReq = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials&scope=creatorsapi/default'
    });

    const tokenData = await tokenReq.json();
    if (!tokenData.access_token) {
      throw new Error("アクセストークンの取得に失敗しました");
    }
    const accessToken = tokenData.access_token;

    // ----------------------------------------------------
    // STEP 2: アクセストークンを使って商品情報を検索（取得）
    // ----------------------------------------------------
    // タイムセールや特選タイムセールなどを意図してキーワードを指定
    const searchBody = {
      "keywords": "タイムセール", 
      "partnerTag": partnerTag,
      "marketplace": "www.amazon.co.jp", // 日本のAmazonを指定。米国なら www.amazon.com
      "resources": [
        "images.primary.small", 
        "itemInfo.title", 
        "offers.listings.price", 
        "itemInfo.features"
      ]
    };

    const searchReq = await fetch("https://creatorsapi.amazon/catalog/v1/searchItems", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': 'v3.3',
        'Content-Type': 'application/json',
        'x-marketplace': 'www.amazon.co.jp'
      },
      body: JSON.stringify(searchBody)
    });

    const searchData = await searchReq.json();
    let items = searchData.items || [];

    // ----------------------------------------------------
    // STEP 3: 取得した商品をランダムにシャッフルして10個抽出
    // ----------------------------------------------------
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    const selectedItems = items.slice(0, 10);

    // フロントエンドに結果を返す
    return new Response(JSON.stringify(selectedItems), {
      headers: { 
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}