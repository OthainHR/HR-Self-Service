import pandas as pd
import streamlit as st
import plotly.express as px
from pathlib import Path

# ───────────────────────────────────────────────
# 1. CONFIG & DATA
# ───────────────────────────────────────────────
st.set_page_config(page_title="Weekly QA Dashboard", layout="wide")
DATA_PATH = Path("weekly-qa.csv")          # drop / overwrite each week

@st.cache_data(show_spinner="Loading data…")
def load_df(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)

    # guarantee timezone‑aware → UTC
    df["Asked At"] = (
        pd.to_datetime(df["Asked At"], utc=True, errors="coerce")
          .dt.tz_convert("UTC")
    )
    df["Answered At"] = (
        pd.to_datetime(df["Answered At"], utc=True, errors="coerce")
          .dt.tz_convert("UTC")
    )
    df["Response Time (s)"] = (
        (df["Answered At"] - df["Asked At"])
          .dt.total_seconds()
          .astype(int)
    )
    return df

# Load data
df = load_df(DATA_PATH)

# ───────────────────────────────────────────────
# 2. TOPIC & GAP FLAGS
# ───────────────────────────────────────────────
TOPIC_KEYWORDS = [
    ("Insurance", ("insurance", "coverage", "policy", "top up")),
    ("Leave / Holidays", ("holiday", "leave", "sandwich")),
    ("Company Info", ("ceo", "founder", "email", "deepesh", "url", "website")),
    ("Process & Support", ("ticket", "process", "submit")),
]
def categorize(q: str) -> str:
    ql = q.lower()
    for topic, kws in TOPIC_KEYWORDS:
        if any(k in ql for k in kws):
            return topic
    return "Other"

df["Topic"] = df["Question"].astype(str).apply(categorize)

GAP_PATTERNS = ("sorry", "apologize", "does not", "not provided", "no information")
df["Unanswered"] = df["Answer"].str.lower().fillna("").apply(
    lambda a: any(p in a for p in GAP_PATTERNS)
)

# ───────────────────────────────────────────────
# 3. KPI ROW
# ───────────────────────────────────────────────
st.title("Weekly HR‑Chatbot QA Dashboard")
st.caption(
    f"Data through "
    f"{df['Asked At'].max().tz_convert('Asia/Kolkata').strftime('%d %b %Y %H:%M IST')}"
)

total_pairs   = len(df)
unique_sessions = df["Session ID"].nunique()
median_rt     = df["Response Time (s)"].median()
p95_rt        = df["Response Time (s)"].quantile(0.95)
gap_pct       = df["Unanswered"].mean()*100

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Q&A pairs",      f"{total_pairs:,}")
c2.metric("Unique sessions", unique_sessions)
c3.metric("Median RT (s)",  f"{median_rt:.2f}")
c4.metric("P95 RT (s)",     f"{p95_rt:.2f}")
c5.metric("Unanswered",     f"{gap_pct:.1f}%")

# repeat stats
df["Question_norm"] = df["Question"].str.lower().str.strip()
repeat_counts = df.groupby("Question_norm").size()
repeat_pairs  = repeat_counts[repeat_counts > 1].sum()
repeat_rate   = (repeat_counts > 1).mean()*100
st.write(f"**Repeat questions:** {repeat_pairs} pairs across {repeat_rate:.1f}% of unique questions")

# ───────────────────────────────────────────────
# 4. CHARTS
# ───────────────────────────────────────────────
# traffic by hour (IST)
df["Hour_IST"] = df["Asked At"].dt.tz_convert('Asia/Kolkata').dt.hour
hourly = df.groupby('Hour_IST').size().reset_index(name='Q&A Count')
st.plotly_chart(
    px.area(hourly, x='Hour_IST', y='Q&A Count', title='Volume by Hour (IST)'),
    use_container_width=True
)

# topic distribution
topic_counts = df['Topic'].value_counts().reset_index()
fig_topic = px.bar(
    topic_counts, x='index', y='Topic',
    labels={'index': 'Topic', 'Topic': 'Questions'},
    title='Questions by Topic', text='Topic'
).update_layout(yaxis_title="")
st.plotly_chart(fig_topic, use_container_width=True)

# answered vs unanswered
labels = {True: 'Unanswered', False: 'Answered'}
fig_gap = px.pie(
    df, values='Question', names=df['Unanswered'].map(labels),
    title='Answered vs Unanswered', hole=0.4
).update_traces(textinfo='percent+label')
st.plotly_chart(fig_gap, use_container_width=True)

# response‑time distribution
st.plotly_chart(
    px.box(df, y='Response Time (s)', title='Response‑Time Distribution', points='outliers'),
    use_container_width=True
)

# median response by topic
topic_rt = df.groupby('Topic')['Response Time (s)'].median().sort_values().reset_index()
st.plotly_chart(
    px.bar(topic_rt, x='Response Time (s)', y='Topic', orientation='h',
           title='Median Response Time by Topic'),
    use_container_width=True
)

# ───────────────────────────────────────────────
# 5. DETAIL TABLES
# ───────────────────────────────────────────────
st.subheader("Top Unanswered Questions")
top_unanswered = (
    df[df['Unanswered']]
      .groupby('Question').size().sort_values(ascending=False)
      .reset_index(name='Count').head(15)
)
st.dataframe(top_unanswered, use_container_width=True)

st.subheader("Slowest Responses")
slowest = (
    df.sort_values('Response Time (s)', ascending=False)
      [['Question', 'Response Time (s)']].head(5)
)
st.dataframe(slowest, use_container_width=True)

st.subheader("Repeat Question Counts (top 10)")
repeat_bar = repeat_counts[repeat_counts > 1].head(10).to_frame("Count")
st.bar_chart(repeat_bar)