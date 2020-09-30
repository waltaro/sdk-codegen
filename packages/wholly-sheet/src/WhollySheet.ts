/*

 MIT License

 Copyright (c) 2020 Looker Data Sciences, Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

import {
  ColumnHeaders,
  IRowModel,
  ITabTable,
  SheetError,
  SheetSDK,
  stringer,
} from './SheetSDK'

export interface IWhollySheet<T extends IRowModel> {
  /** Initialized REST-based GSheets SDK */
  sheets: SheetSDK
  /** Name of the tab */
  name: string
  /** Header column names */
  header: ColumnHeaders
  /** Name of the key column that represents the "id" */
  keyColumn: string
  /** All data in the sheet */
  rows: T[]
  /** Keyed row retrieval */
  index: Record<string, T>
  /** What's the next row of the sheet? */
  nextRow: number

  // TODO figure out init generic typing issue
  // init(values?: any): (values?: any) => T

  /** Verify the column order in the sheet matches the key order of the row type */
  checkHeader(header: ColumnHeaders): boolean
  /** Gets the row's values in table.header column order */
  values(model: T): any[]
  /** Converts raw rows into typed rows. TODO replace with constructor argument */
  typeRows<T extends IRowModel>(rows: any[]): T[]
  save<T extends IRowModel>(model: T): Promise<T>
  create<T extends IRowModel>(model: T): Promise<T>
  update<T extends IRowModel>(model: T): Promise<T>
  find(value: any, columnName?: string): T | undefined
}

// https://github.com/gsuitedevs/node-samples/blob/master/sheets/snippets/test/helpers.js

/** CRUF (no delete) operations for a GSheet */
export abstract class WhollySheet<T extends IRowModel>
  implements IWhollySheet<T> {
  index: Record<string, T> = {}
  rows: T[]
  protected constructor(
    public readonly sheets: SheetSDK,
    public readonly name: string,
    public readonly table: ITabTable,
    public readonly keyColumn: string = 'id' // public readonly NewItem: RowModelFactory<T>
  ) {
    this.rows = this.typeRows(table.rows)
    this.checkHeader()
    this.createIndex()
    this.checkHeader()
  }

  // Using this until I can figure out the constructor syntax, maybe https://stackoverflow.com/a/43674389
  abstract typeRows<T extends IRowModel>(rows: any[]): T[]

  // // TODO figure out init generic typing issue
  // init(values?: any): T {
  //   const result: T = new this.NewItem(values)
  //   return result
  // }

  /**
   * convert value to the strong type, or undefined if not value
   * @param value to strongly type
   * @private
   */
  private toAT<T extends IRowModel>(value: unknown): T | undefined {
    if (value) return value as T
    return undefined
  }

  checkHeader() {
    // Nothing to check
    if (this.rows.length === 0) return true
    const row = this.rows[0]
    const rowHeader = row.header().join()
    const tableHeader = this.table.header.join()
    if (tableHeader !== rowHeader)
      throw new SheetError(
        `Expected table.header to be ${rowHeader} not ${tableHeader}`
      )
    return true
  }

  get header() {
    return this.table.header
  }

  get nextRow() {
    return this.rows.length
  }

  private createIndex() {
    this.index = {}
    this.rows.forEach((r) => {
      this.index[r[this.keyColumn]] = r
    })
  }

  values<T extends IRowModel>(model: T) {
    const result: any[] = []
    this.header.forEach((h) => {
      result.push(stringer(model[h]))
    })
    return result
  }

  async save<T extends IRowModel>(model: T): Promise<T> {
    // A model with a non-zero row is an update
    if (model.row) return await this.update<T>(model)
    return await this.create<T>(model)
  }

  checkId<T extends IRowModel>(model: T) {
    if (!model[this.keyColumn])
      throw new SheetError(
        `"${this.keyColumn}" must be assigned for row ${model.row}`
      )
  }

  async create<T extends IRowModel>(model: T): Promise<T> {
    this.checkId(model)
    if (model.row !== 0)
      throw new SheetError(
        `"${model.id}" row must be 0, not ${model.row} to create`
      )
    const values = this.values(model)
    const result = await this.sheets.createRow(this.name, this.nextRow, values)
    model.assign(result)
    // this.rows.push(this.toAT(model))
    // ID may have changed
    this.createIndex()
    return model
  }

  async update<T extends IRowModel>(model: T): Promise<T> {
    this.checkId(model)
    if (!model.row)
      throw new SheetError(`"${model.id}" row must be > 0 to update`)

    const values = this.values(model)
    /** This will throw an error if the request fails */
    const result = await this.sheets.updateRow(this.name, model.row, values)
    this.rows[model.row].assign(result)
    // ID may have changed
    this.createIndex()
    return (this.rows[model.row] as unknown) as T
  }

  find(value: any, columnName?: string): T | undefined {
    if (!value) return undefined
    let key = columnName || this.keyColumn
    if (typeof value === 'number') {
      // Default key to row
      if (!columnName) key = 'row'
    }
    if (columnName === this.keyColumn) {
      // Find by index
      return this.toAT(this.index[value.toString()])
    }
    return this.toAT(this.rows.find((r) => r[key] === value))
  }
}
