import pandas as pd
import streamlit as st
import plotly.express as px
from pathlib import Path

# 1. LOAD & CLEAN
st.set_page_config(page_title="Weekly QA Dashboard", layout="wide")

DATA_PATH = Path("weekly-qa.csv")  # Drop this week's file here

@st.cache_data
def load_df(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["Asked At"] = pd.to_datetime(df["Asked At"])
    df["Answered At"] = pd.to_datetime(df["Answered At"])
    df["Response Time (s)"] = (df["Answered At"] - df["Asked At"]).dt.total_seconds()
    return df

df = load_df(DATA_PATH)

# 2. DERIVE METRICS & CATEGORIES
def categorize(q: str) -> str:
    ql = q.lower()
    if any(k in ql for k in ("insurance", "coverage", "policy")):
        return "Insurance"
    if any(k in ql for k in ("holiday", "leave")):
        return "Leave / Holidays"
    if any(k in ql for k in ("ceo", "founder", "email", "deepesh")):
        return "Company Info"
    if any(k in ql for k in ("ticket", "process", "submit")):
        return "Process & Support"
    return "Other"

df["Topic"] = df["Question"].astype(str).apply(categorize)

gap_patterns = ["sorry", "apologize", "does not", "not provided", "no information"]
df["Unanswered"] = df["Answer"].str.lower().fillna("").apply(
    lambda a: any(p in a for p in gap_patterns)
)

# 3. KPI ROW
st.title("Weekly HR‑Chatbot QA Dashboard")
# 3. SUMMARY METRICS
total_pairs = len(df)
unique_sessions = df['Session ID'].nunique()
avg_response = df['Response Time (s)'].mean()
median_response = df['Response Time (s)'].median()
p90 = df['Response Time (s)'].quantile(0.90)
p95 = df['Response Time (s)'].quantile(0.95)
p99 = df['Response Time (s)'].quantile(0.99)
gap_ratio = df['Unanswered'].mean()

col1, col2, col3, col4, col5, col6 = st.columns(6)
col1.metric("Q&A pairs", f"{total_pairs:,}")
col2.metric("Unique sessions", unique_sessions)
col3.metric("Avg RT (s)", f"{avg_response:.2f}")
col4.metric("Median RT (s)", f"{median_response:.2f}")
col5.metric("P90 RT (s)", f"{p90:.2f}")
col6.metric("Unanswered %", f"{gap_ratio*100:.1f}%")

# Repeat question stats
df['Question_norm'] = df['Question'].str.lower().str.strip()
repeat_counts = df.groupby('Question_norm').size()
repeat_rate = (repeat_counts > 1).mean()
repeat_pairs = repeat_counts[repeat_counts > 1].sum()
st.write(f"**Repeat questions:** {repeat_pairs} pairs across {repeat_rate*100:.1f}% of unique questions")

# 4. MAIN CHARTS
# 4-A Volume by Hour (IST)
df['Hour_IST'] = df['Asked At'].dt.tz_convert('Asia/Kolkata').dt.hour
hourly = df.groupby('Hour_IST').size().reset_index(name='Q&A Count')
fig_hour_ist = px.area(
    hourly,
    x='Hour_IST', y='Q&A Count',
    title='Volume by Hour (IST)'
)
st.plotly_chart(fig_hour_ist, use_container_width=True)

# 4-B Topic distribution
fig_topic = px.bar(
    df["Topic"].value_counts().reset_index(),
    x="index", y="Topic",
    labels={"index": "Topic", "Topic": "Questions"},
    title="Questions by Topic",
    text="Topic"
)
fig_topic.update_layout(yaxis_title="")
st.plotly_chart(fig_topic, use_container_width=True)

# 4-C Knowledge‑gap share
tfig_gap = px.pie(
    df, values="Question", names="Unanswered",
    title="Answered vs Unanswered", hole=0.4
)
tfig_gap.update_traces(textinfo="percent+label")
st.plotly_chart(fig_gap, use_container_width=True)

# 4-D Response‑time distribution
fig_rt = px.box(df, y="Response Time (s)", title="Response‑Time Distribution")
st.plotly_chart(fig_rt, use_container_width=True)

# 4-D Median Response by Topic
topic_response = df.groupby('Topic')['Response Time (s)'].median().sort_values()
fig_topic_rt = px.bar(
    topic_response.reset_index(),
    x='Response Time (s)', y='Topic', orientation='h',
    title='Median Response Time by Topic'
)
st.plotly_chart(fig_topic_rt, use_container_width=True)

# 5. TOP UNANSWERED TABLE
st.subheader("Top Unanswered Questions")
top_unanswered = (
    df[df["Unanswered"]]
    .groupby("Question")
    .size()
    .sort_values(ascending=False)
    .reset_index(name="Count")
    .head(15)
)
st.dataframe(top_unanswered, use_container_width=True)

# 5-B Slowest Responses
st.subheader("Slowest Response Times")
slow_entries = df.sort_values('Response Time (s)', ascending=False)
slow_entries = slow_entries[['Question', 'Response Time (s)']].head(5)
st.dataframe(slow_entries, use_container_width=True)

# 5-C Repeat Rate Histogram
st.subheader("Repeat Question Counts")
st.bar_chart(repeat_counts[repeat_counts > 1].head(10)) 