export type fetchTestType = {
    date: string;
    contentType: number; // 1, 2, 3, 4 (ヘッダーID)
    emissionType: string; // pla or mud
    company: number;
    conmanyName: string;
    companyBgColor: string;
    planVol: number;
    planTime: string;
    resultId: string;
    resultVol: number;
    resultTime: string;
    outsaideResultId: string;
    outsaideResultVol: number;
    outsaideResultTime: string;
}
export type testType = {
    date: string;
    dayLabel: string;
    isHoliday: boolean;
    isSturday: boolean;
    contentType: number; // 1, 2, 3, 4 (ヘッダーID)
    emissionType: string; // pla or mud
    company: number;
    conmanyName: string;
    companyBgColor: string;
    planVol: number;
    planTime: string;
    resultId: string;
    resultVol: number;
    resultTime: string;
    outsaideResultId: string;
    outsaideResultVol: number;
    outsaideResultTime: string;
}