# 食物照片辨識模型（本機訓練）

訓練在你的電腦（RTX 3050）上進行；網站只放訓練好的 `model.onnx`，在用戶手機上預測，照片不會上傳。

## 一次性安裝

```powershell
py -3.12 -m venv ml\.venv
ml\.venv\Scripts\python -m pip install --upgrade pip
ml\.venv\Scripts\python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
ml\.venv\Scripts\python -m pip install onnx onnxscript onnxruntime numpy pillow
ml\.venv\Scripts\python -c "import torch; print(torch.cuda.is_available())"   # 應該顯示 True
```

## 三個步驟

| 步驟    | 指令                                                                            | 輸出                                          |
| ------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| 1. 訓練 | `ml\.venv\Scripts\python -I ml\train.py --data-dir ml\data\my_food --epochs 15` | `ml\runs\<名稱>\best.pt`                      |
| 2. 評估 | `ml\.venv\Scripts\python -I ml\evaluate.py --run <名稱>`                        | 準確度、最差類別、最常搞混的菜                |
| 3. 匯出 | `ml\.venv\Scripts\python -I ml\export_onnx.py --run <名稱> --int8`              | `ml\runs\<名稱>\web\model.onnx` + `meta.json` |

用 Food-101 測試流程：第 1 步改成 `--dataset food101 --download --epochs 10`（第一次會下載約 4.7 GB）。
**Food-101 只限研究用途，訓練出的模型不能用在正式產品。**

## 自己的照片放法

```
ml\data\my_food\
  nasi_lemak\  001.jpg 002.jpg ...
  roti_canai\  ...
  chicken_rice\ ...
```

- 資料夾名稱就是類別名稱（用英文小寫和底線）。
- 每類至少 100 張，最好 200–300 張；不同店家、角度、光線。
- 系統會自動分成 訓練 70% / 驗證 15% / 測試 15%（固定 seed，可重現）。
- 想自己指定測試照片：改用 `train\`、`val\`、`test\` 三個子資料夾，各自放同樣的類別資料夾。
- 只用你擁有或取得授權的照片。

## 注意

- `ml\data\`、`ml\runs\`、`ml\.venv\` 不會上傳到 GitHub。
- 測試準確度要看 `evaluate.py` 的結果（沒參與訓練的照片），不要看訓練時的數字。
