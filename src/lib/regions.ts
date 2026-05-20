/**
 * 简化版中国行政区划（省/市/区）
 * 仅含直辖市、省会、热门城市，足以演示与生产替换
 * 生产用 pca-code 完整数据可替换此文件
 */
export type Region = { name: string; children?: Region[] };

export const regions: Region[] = [
  { name: "北京市", children: [{ name: "北京市", children: ["东城区","西城区","朝阳区","海淀区","丰台区","石景山区","门头沟区","房山区","通州区","顺义区","昌平区","大兴区","怀柔区","平谷区","密云区","延庆区"].map(n => ({ name: n })) }] },
  { name: "上海市", children: [{ name: "上海市", children: ["黄浦区","徐汇区","长宁区","静安区","普陀区","虹口区","杨浦区","闵行区","宝山区","嘉定区","浦东新区","金山区","松江区","青浦区","奉贤区","崇明区"].map(n => ({ name: n })) }] },
  { name: "天津市", children: [{ name: "天津市", children: ["和平区","河东区","河西区","南开区","河北区","红桥区","东丽区","西青区","津南区","北辰区","武清区","宝坻区","滨海新区","宁河区","静海区","蓟州区"].map(n => ({ name: n })) }] },
  { name: "重庆市", children: [{ name: "重庆市", children: ["渝中区","江北区","沙坪坝区","九龙坡区","南岸区","北碚区","渝北区","巴南区"].map(n => ({ name: n })) }] },
  { name: "广东省", children: [
    { name: "广州市", children: ["越秀区","海珠区","荔湾区","天河区","白云区","黄埔区","番禺区","花都区","南沙区","从化区","增城区"].map(n => ({ name: n })) },
    { name: "深圳市", children: ["福田区","罗湖区","南山区","盐田区","宝安区","龙岗区","龙华区","坪山区","光明区","大鹏新区"].map(n => ({ name: n })) },
    { name: "东莞市", children: ["东莞市"].map(n => ({ name: n })) },
    { name: "佛山市", children: ["禅城区","南海区","顺德区","三水区","高明区"].map(n => ({ name: n })) }
  ]},
  { name: "江苏省", children: [
    { name: "南京市", children: ["玄武区","秦淮区","建邺区","鼓楼区","浦口区","栖霞区","雨花台区","江宁区","六合区","溧水区","高淳区"].map(n => ({ name: n })) },
    { name: "苏州市", children: ["姑苏区","虎丘区","吴中区","相城区","吴江区","昆山市","张家港市","常熟市","太仓市"].map(n => ({ name: n })) },
    { name: "无锡市", children: ["梁溪区","锡山区","惠山区","滨湖区","新吴区","江阴市","宜兴市"].map(n => ({ name: n })) }
  ]},
  { name: "浙江省", children: [
    { name: "杭州市", children: ["上城区","拱墅区","西湖区","滨江区","萧山区","余杭区","临平区","钱塘区","富阳区","临安区","建德市","桐庐县","淳安县"].map(n => ({ name: n })) },
    { name: "宁波市", children: ["海曙区","江北区","北仑区","镇海区","鄞州区","奉化区","余姚市","慈溪市"].map(n => ({ name: n })) }
  ]},
  { name: "四川省", children: [
    { name: "成都市", children: ["锦江区","青羊区","金牛区","武侯区","成华区","龙泉驿区","青白江区","新都区","温江区","双流区","郫都区","新津区"].map(n => ({ name: n })) }
  ]},
  { name: "陕西省", children: [
    { name: "西安市", children: ["新城区","碑林区","莲湖区","灞桥区","未央区","雁塔区","阎良区","临潼区","长安区","高陵区","鄠邑区"].map(n => ({ name: n })) }
  ]},
  { name: "湖北省", children: [
    { name: "武汉市", children: ["江岸区","江汉区","硚口区","汉阳区","武昌区","青山区","洪山区","东西湖区","汉南区","蔡甸区","江夏区","黄陂区","新洲区"].map(n => ({ name: n })) }
  ]},
  { name: "山东省", children: [
    { name: "济南市", children: ["历下区","市中区","槐荫区","天桥区","历城区","长清区","章丘区","济阳区","莱芜区","钢城区"].map(n => ({ name: n })) },
    { name: "青岛市", children: ["市南区","市北区","黄岛区","崂山区","李沧区","城阳区","即墨区","胶州市","平度市","莱西市"].map(n => ({ name: n })) }
  ]},
  { name: "河南省", children: [
    { name: "郑州市", children: ["中原区","二七区","管城回族区","金水区","上街区","惠济区","中牟县","巩义市","荥阳市","新密市","新郑市","登封市"].map(n => ({ name: n })) }
  ]},
  { name: "湖南省", children: [
    { name: "长沙市", children: ["芙蓉区","天心区","岳麓区","开福区","雨花区","望城区","长沙县","浏阳市","宁乡市"].map(n => ({ name: n })) }
  ]},
  { name: "福建省", children: [
    { name: "福州市", children: ["鼓楼区","台江区","仓山区","马尾区","晋安区","长乐区","闽侯县","连江县"].map(n => ({ name: n })) },
    { name: "厦门市", children: ["思明区","海沧区","湖里区","集美区","同安区","翔安区"].map(n => ({ name: n })) }
  ]}
];

export function provinces() { return regions.map(r => r.name); }
export function citiesOf(province?: string) {
  return regions.find(r => r.name === province)?.children?.map(c => c.name) || [];
}
export function districtsOf(province?: string, city?: string) {
  const p = regions.find(r => r.name === province);
  const c = p?.children?.find(cc => cc.name === city);
  return c?.children?.map(d => d.name) || [];
}
