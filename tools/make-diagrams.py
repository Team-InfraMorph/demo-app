"""Generate original explanatory diagrams, not screenshots. Requires Pillow locally."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import io, json, base64
ROOT=Path(__file__).resolve().parents[1]
FONT='/System/Library/Fonts/AppleSDGothicNeo.ttc'
def font(n):return ImageFont.truetype(FONT,n)
CASES=[
 ('flow','코드에서 서비스까지','소스 분석 → 정책 검사 → 빌드 → Local 실행. 공개 응답은 실행 후 별도로 확인합니다.', ['GitHub 소스','분석 · 검사','빌드 이미지','Local 실행'], ['고정 commit','실제 코드 근거','승인된 변환','공개 응답 확인']),
 ('policy','세 번 확인하는 연결','분석 근거, 변경 패치, 최종 빌드 입력을 각각 확인합니다. 정책 통과와 실행 성공은 별도입니다.', ['분석 근거','변경 패치','빌드 입력'], ['실제 파일 · 줄','허용 변환 · 해시','검사한 결과물']),
 ('storage','코드는 바뀌어도 데이터는 이어져요','Local에서는 SQLite 설계를 PostgreSQL과 영구 볼륨으로 변환합니다. AWS 변환은 기존 샘플 설명이며 체험 보드는 Local 전용입니다.', ['원본 앱','Local 체험','기존 AWS 설계'], ['SQLite · uploads','PostgreSQL · 볼륨','RDS · S3']),
 ('builder','만드는 일과 실행하는 일','Builder가 만든 검증 이미지의 식별값을 Adapter가 확인한 뒤 실행합니다.', ['Builder','검증된 이미지','Local Adapter'], ['템플릿으로 빌드','소스 · 패치 연결','Compose · 터널']),
 ('retention','다음 버전에서도, 같은 기록','같은 프로젝트에서 V1의 메모와 이미지 확인키를 V2 서버로 조회해 데이터 유지를 확인합니다.', ['V1 저장','V2 변경 배포','서버 재조회'], ['메모 ID · 이미지 키','동일 프로젝트','내용 · 이미지 해시'])]
for i,(key,title,desc,labels,sub) in enumerate(CASES,1):
 im=Image.new('RGB',(900,560),'#f2f4ff');d=ImageDraw.Draw(im)
 d.rounded_rectangle((22,22,878,538),radius=26,fill='#ffffff')
 d.text((55,58),f'INFRAMORPH / {i:02d}',font=font(17),fill='#8172c6')
 d.text((55,99),title,font=font(34),fill='#292d49')
 d.text((55,153),'설명 그림 · 실행 결과와 별도로 읽어 주세요',font=font(17),fill='#717a94')
 n=len(labels);gap=24;w=(790-gap*(n-1))/n
 for j,(label,caption) in enumerate(zip(labels,sub)):
  x=55+j*(w+gap);d.rounded_rectangle((x,245,x+w,422),radius=20,fill=['#edf1ff','#f2ecff','#eaf6fa','#eef3ff'][j])
  d.ellipse((x+20,269,x+56,305),fill='#7565d5');d.text((x+32,274),str(j+1),font=font(20),fill='white')
  d.text((x+19,328),label,font=font(22),fill='#3f4265');d.text((x+19,371),caption,font=font(16),fill='#6c7490')
  if j<n-1:d.text((x+w+6,320),'›',font=font(26),fill='#9e92da')
 d.text((55,477),'작은 기록으로 배포의 변화를 확인합니다.',font=font(18),fill='#737a92')
 buf=io.BytesIO();im.save(buf,format='PNG',optimize=True)
 asset=dict(id=key,title=title,description=desc,kind='diagram',mime='image/png',data=base64.b64encode(buf.getvalue()).decode())
 p=ROOT/'src/web/assets'/f'{key}.json';p.write_text(json.dumps(asset,ensure_ascii=False)+'\n');assert p.stat().st_size<=220*1024
