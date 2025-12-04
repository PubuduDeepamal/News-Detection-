import os
import json
import re
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, confusion_matrix, roc_curve, auc, precision_recall_curve, classification_report, precision_score, recall_score, f1_score
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from joblib import dump

DATA_DIR = "/var/www/newsdetection/client/datasets"
ARTIFACTS_DIR = "/var/www/newsdetection/ml/artifacts"
REPORTS_DIR = "/var/www/newsdetection/ml/reports"
LOGS_DIR = "/var/www/newsdetection/ml/logs"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

fake = pd.read_csv(os.path.join(DATA_DIR, 'Fake.csv'))
true = pd.read_csv(os.path.join(DATA_DIR, 'True.csv'))

fake['label'] = 1
true['label'] = 0

for df in (fake, true):
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].fillna("")

fake['text_all'] = (fake.get('title','') + ' ' + fake.get('text','')).str.strip()
true['text_all'] = (true.get('title','') + ' ' + true.get('text','')).str.strip()

all_df = pd.concat([fake[['text_all','label']], true[['text_all','label']]], ignore_index=True)
all_df = all_df[all_df['text_all'].str.len()>0]

all_df['text_cleaned'] = all_df['text_all'].apply(clean_text)
all_df = all_df[all_df['text_cleaned'].str.len()>10]

# Optionally augment with high-confidence GPT pseudo-labels collected from production
gpt_csv = os.path.join(LOGS_DIR, 'gpt_feedback.csv')
if os.path.exists(gpt_csv):
    try:
        gpt_df = pd.read_csv(gpt_csv)
        # Expect columns: timestamp,method,content,isFake,confidence,explanation,factors
        cols_ok = set(['content','isFake','confidence']).issubset(set(gpt_df.columns))
        if cols_ok:
            gpt_df = gpt_df.dropna(subset=['content','isFake','confidence'])
            # Keep only very confident predictions to reduce noise
            gpt_df = gpt_df[gpt_df['confidence'].astype(float) >= 85.0]
            if len(gpt_df) > 0:
                gpt_df = gpt_df.assign(
                    label = gpt_df['isFake'].astype(int).clip(0,1),
                    text_all = gpt_df['content'].astype(str)
                )
                gpt_df['text_cleaned'] = gpt_df['text_all'].apply(clean_text)
                gpt_df = gpt_df[gpt_df['text_cleaned'].str.len() > 10]
                # Cap contribution to avoid overwhelming original data
                cap = min(5000, len(gpt_df))
                gpt_df = gpt_df.sample(n=cap, random_state=42) if len(gpt_df) > cap else gpt_df
                all_df = pd.concat([all_df, gpt_df[['text_cleaned','label']]], ignore_index=True)
                print(f"Augmented training with {len(gpt_df)} high-confidence GPT samples")
        else:
            print("GPT CSV present but missing expected columns; skipping augmentation")
    except Exception as e:
        print(f"Failed to load GPT feedback CSV: {e}")

max_samples = 30000
if len(all_df) > max_samples:
    all_df = all_df.sample(n=max_samples, random_state=42).reset_index(drop=True)
    print(f"Using subset of {max_samples} samples for memory efficiency")

X = all_df['text_cleaned'].values
y = all_df['label'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

pipe = Pipeline([
    ('tfidf', TfidfVectorizer(
        stop_words='english',
        ngram_range=(1,1),
        max_features=500,
        min_df=20,
        max_df=0.95,
        sublinear_tf=True,
        use_idf=False
    )),
    ('lr', LogisticRegression(
        max_iter=50,
        C=0.005,
        penalty='l2',
        class_weight='balanced',
        random_state=42,
        solver='liblinear'
    ))
])

print("Fitting model...")
pipe.fit(X_train, y_train)

print("\nRunning 3-fold cross-validation...")
sample_size = min(8000, len(X_train))
indices = np.random.choice(len(X_train), sample_size, replace=False)
cv_scores = cross_val_score(pipe, X_train[indices], y_train[indices], cv=3, scoring='accuracy')
print(f"CV scores (on {sample_size} samples): {cv_scores}")
print(f"Mean CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

y_prob = pipe.predict_proba(X_test)[:,1]
y_pred = (y_prob >= 0.5).astype(int)
acc = float(accuracy_score(y_test, y_pred))
precision = float(precision_score(y_test, y_pred, zero_division=0))
recall = float(recall_score(y_test, y_pred, zero_division=0))
f1 = float(f1_score(y_test, y_pred, zero_division=0))
cm = confusion_matrix(y_test, y_pred)
fpr, tpr, _ = roc_curve(y_test, y_prob)
roc_auc = float(auc(fpr, tpr))
prec, rec, _ = precision_recall_curve(y_test, y_prob)
pr_auc = float(auc(rec, prec))

metrics_dict = {
    'accuracy': acc,
    'precision': precision,
    'recall': recall,
    'f1': f1,
    'roc_auc': roc_auc,
    'pr_auc': pr_auc,
    'n_train': int(len(X_train)),
    'n_test': int(len(X_test)),
    'cv_mean': float(cv_scores.mean()),
    'cv_std': float(cv_scores.std())
}

with open(os.path.join(REPORTS_DIR, 'metrics.json'), 'w') as f:
    json.dump(metrics_dict, f, indent=2)

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['True News', 'Fake News']))
with open(os.path.join(REPORTS_DIR, 'classification_report.txt'), 'w') as f:
    f.write(classification_report(y_test, y_pred, target_names=['True News', 'Fake News']))

plt.figure(figsize=(5,4))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['True','Fake'], yticklabels=['True','Fake'])
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.tight_layout()
plt.savefig(os.path.join(REPORTS_DIR, 'confusion_matrix.png'))
plt.close()

plt.figure(figsize=(5,4))
plt.plot(fpr, tpr, label=f'AUC={roc_auc:.3f}')
plt.plot([0,1],[0,1],'--', color='gray')
plt.xlabel('FPR')
plt.ylabel('TPR')
plt.legend(loc='lower right')
plt.tight_layout()
plt.savefig(os.path.join(REPORTS_DIR, 'roc_curve.png'))
plt.close()

plt.figure(figsize=(5,4))
plt.plot(rec, prec, label=f'AUC={pr_auc:.3f}')
plt.xlabel('Recall')
plt.ylabel('Precision')
plt.legend(loc='lower left')
plt.tight_layout()
plt.savefig(os.path.join(REPORTS_DIR, 'pr_curve.png'))
plt.close()

# Summary bar chart of core metrics
plt.figure(figsize=(6,4))
names = ['Accuracy', 'Precision', 'Recall', 'F1', 'ROC AUC', 'PR AUC']
values = [acc, precision, recall, f1, roc_auc, pr_auc]
bars = sns.barplot(x=names, y=values, palette='Blues_d')
plt.ylim(0, 1.0)
for c in bars.containers:
    bars.bar_label(c, fmt='%.3f')
plt.xticks(rotation=20, ha='right')
plt.ylabel('Score')
plt.title('Model Performance Summary')
plt.tight_layout()
plt.savefig(os.path.join(REPORTS_DIR, 'metrics_summary.png'))
plt.close()

dump(pipe, os.path.join(ARTIFACTS_DIR, 'news_model.joblib'))

print("\n" + "="*50)
print("MODEL TRAINING COMPLETE")
print("="*50)
print(json.dumps(metrics_dict, indent=2))
