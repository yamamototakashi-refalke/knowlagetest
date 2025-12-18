/* ===================================================
   Knowledge Search - JavaScriptロジック
   
   機能:
   - Webhook / APIとの連携
   - 検索リクエストの送信
   - 結果の表示とエラーハンドリング
   - Enterキーでの検索対応
   ================================================== */

/* ============ 設定 ============ */
// 注: 本番環境では、このURLを実際のWebhook URLに置き換えてください
const API_CONFIG = {
    // n8n の Webhook URL （例）
    endpoint: 'http://localhost:5678/webhook/ai-search',
    
    // リクエストタイムアウト（ミリ秒）
    timeout: 30000,
    
    // リトライ回数
    maxRetries: 1
};

/* ============ DOM要素の取得 ============ */
const elements = {
    queryInput: document.getElementById('queryInput'),
    searchBtn: document.getElementById('searchBtn'),
    btnText: document.getElementById('btnText'),
    resultSection: document.getElementById('resultSection'),
    loadingState: document.getElementById('loadingState'),
    resultContent: document.getElementById('resultContent'),
    errorContent: document.getElementById('errorContent'),
    answerText: document.getElementById('answerText'),
    metadata: document.getElementById('metadata'),
    sourcesContainer: document.getElementById('sourcesContainer'),
    sourcesList: document.getElementById('sourcesList'),
    errorMessage: document.getElementById('errorMessage')
};

/* ============ 検索処理のメイン関数 ============ */
async function handleSearch() {
    // 1. バリデーション
    const query = elements.queryInput.value.trim();
    
    if (!query) {
        alert('質問を入力してください');
        return;
    }

    // 2. UI状態の初期化
    showLoading();

    try {
        // 3. API呼び出し
        const response = await callAPI(query);

        // 4. 結果の表示
        displayResult(response);
        
    } catch (error) {
        // 5. エラー表示
        displayError(error);
        
    } finally {
        // 6. UI状態の復元
        restoreButtonState();
    }
}

/* ============ UI状態管理 ============ */

/**
 * ローディング状態を表示
 */
function showLoading() {
    // ボタンを無効化
    elements.searchBtn.disabled = true;
    elements.btnText.textContent = '検索中...';

    // 結果エリアを表示
    elements.resultSection.style.display = 'block';
    elements.loadingState.style.display = 'block';
    elements.resultContent.style.display = 'none';
    elements.errorContent.style.display = 'none';

    // ページトップまでスクロール
    setTimeout(() => elements.resultSection.scrollIntoView({ behavior: 'smooth' }), 100);
}

/**
 * ボタン状態を復元
 */
function restoreButtonState() {
    elements.searchBtn.disabled = false;
    elements.btnText.textContent = '検索';
}

/* ============ API通信 ============ */

/**
 * APIにリクエストを送信
 * @param {string} query - 検索クエリ
 * @returns {Promise<object>} - API レスポンス
 */
async function callAPI(query) {
    const requestBody = {
        query: query,
        timestamp: new Date().toISOString()
    };

    console.log('🔍 検索リクエスト:', requestBody);

    try {
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            // タイムアウト設定
            signal: AbortSignal.timeout(API_CONFIG.timeout)
        });

        // ステータスチェック
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
        }

        // JSON解析
        const data = await response.json();
        console.log('✅ API レスポンス:', data);

        return data;

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`リクエストがタイムアウトしました（${API_CONFIG.timeout / 1000}秒以上）`);
        }
        throw error;
    }
}

/* ============ 結果表示 ============ */

/**
 * API結果を画面に表示
 * @param {object} data - APIレスポンスデータ
 */
function displayResult(data) {
    elements.loadingState.style.display = 'none';
    elements.resultContent.style.display = 'block';
    elements.errorContent.style.display = 'none';

    // 回答テキストを表示
    const answer = data.answer || data.message || '回答が取得できませんでした';
    elements.answerText.textContent = answer;

    // メタデータを表示（オプション）
    if (data.metadata) {
        displayMetadata(data.metadata);
    }

    // 参照記事を表示（オプション）
    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
        displaySources(data.sources);
    } else {
        elements.sourcesContainer.style.display = 'none';
    }
}

/**
 * メタデータを表示
 * @param {object} metadata - メタデータオブジェクト
 */
function displayMetadata(metadata) {
    const items = [];

    // ファイル数
    if (metadata.fileCount !== undefined) {
        items.push(`<div class="metadata-item">📄 ${metadata.fileCount}件のファイルを参照</div>`);
    }

    // タイムスタンプ
    if (metadata.timestamp) {
        const date = new Date(metadata.timestamp);
        const timeStr = date.toLocaleString('ja-JP');
        items.push(`<div class="metadata-item">⏱️ ${timeStr}</div>`);
    }

    // 処理時間
    if (metadata.processingTime !== undefined) {
        items.push(`<div class="metadata-item">⚡ ${metadata.processingTime.toFixed(2)}秒</div>`);
    }

    if (items.length > 0) {
        elements.metadata.innerHTML = items.join('');
    }
}

/**
 * 参照記事一覧を表示
 * @param {array} sources - ソース情報の配列
 */
function displaySources(sources) {
    elements.sourcesContainer.style.display = 'block';

    // ソースリストのHTML生成
    const sourceHTML = sources
        .map((source, index) => {
            const name = source.name || source.title || `参照 ${index + 1}`;
            const url = source.url || source.link || '#';

            return `
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="source-item">
                    <svg class="source-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <span class="source-name">${escapeHtml(name)}</span>
                </a>
            `;
        })
        .join('');

    elements.sourcesList.innerHTML = sourceHTML;
}

/**
 * HTMLエスケープ（XSS対策）
 * @param {string} text - テキスト
 * @returns {string} - エスケープ済みテキスト
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ============ エラー処理 ============ */

/**
 * エラーメッセージを表示
 * @param {Error} error - エラーオブジェクト
 */
function displayError(error) {
    console.error('❌ エラー発生:', error);

    elements.loadingState.style.display = 'none';
    elements.resultContent.style.display = 'none';
    elements.errorContent.style.display = 'block';

    // エラーメッセージ
    let errorMsg = error.message || 'エラーが発生しました';
    
    // ネットワークエラーの場合の詳細メッセージ
    if (error.message.includes('Failed to fetch')) {
        errorMsg = 'サーバーに接続できません。\n\nWebhook URLを確認してください:\n' + API_CONFIG.endpoint;
    }

    elements.errorMessage.textContent = errorMsg;
}

/* ============ キーボード操作 ============ */

// Enter キーで検索実行（Shift+Enter は改行）
elements.queryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSearch();
    }
});

// フォーカス時にフォームをクリア
elements.queryInput.addEventListener('focus', (event) => {
    if (!elements.queryInput.value.trim()) {
        elements.queryInput.placeholder = '質問を入力してください\n例：プロジェクトの進め方、契約書のテンプレート、etc.';
    }
});

/* ============ デバッグ用ヘルパー関数 ============ */

/**
 * テスト用：モックレスポンスを表示
 * （開発時に、サーバー側が未完成の場合に使用）
 */
function showMockResult() {
    const mockData = {
        answer: 'これはテストの回答です。実際のAPIレスポンスがここに表示されます。',
        metadata: {
            fileCount: 3,
            timestamp: new Date().toISOString(),
            processingTime: 1.23
        },
        sources: [
            {
                name: 'プロジェクト進行ガイド',
                url: 'https://example.com/guide'
            },
            {
                name: '契約書テンプレート',
                url: 'https://example.com/template'
            }
        ]
    };

    displayResult(mockData);
    restoreButtonState();
}

// 開発用: コンソールから showMockResult() で テスト表示を確認できます
console.log('💡 開発中です。テスト用に console で showMockResult() を実行できます。');
console.log('API endpoint:', API_CONFIG.endpoint);


