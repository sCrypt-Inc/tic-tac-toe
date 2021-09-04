import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { DotWalletToken } from "./utils";

const Request = axios.create({
  timeout: 20000,
});

export const requestInterceptor = (config: AxiosRequestConfig) => {
  const access_token = DotWalletToken.get();

  if (access_token) {
    config.headers["Authorization"] = "Bearer " + access_token;
  }



  return config;
};

Request.interceptors.request.use(requestInterceptor, (error) =>
  Promise.reject(error)
);

export const responseIntercepter = async (res: AxiosResponse) => {
  if (res && +res.status === 200) {
    if(+res.data.code === 75000){
      localStorage.clear()
      alert("Re-login")
      window.location.href = '';
    }
    if (+res.data.code === 0) {
      return Promise.resolve(res);
    } else {
      return Promise.reject(res);
    }
  }

  if (res && res.status >= 400) {
    return Promise.reject(res);
  }

  return Promise.resolve(res);
};

Request.interceptors.response.use(responseIntercepter, (error) =>
  Promise.reject(error)
);

export default Request;
